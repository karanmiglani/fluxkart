const express = require('express')
const db = require('../db/db')
const helper = require('../utils/contactHelpers')


const identifyContact = async(req , resp) => {
    const {email , phoneNumber} = req.body
    if(!email && !phoneNumber){
        return resp.status(200).json({message:'Either email or phone number is required!'})
    }
    let connection;
    try{
        connection = await db.getConnection();
        await connection.beginTransaction();
        let existingContacts = await helper.getContacts(email , phoneNumber);
        let primaryContactId = null;
        let emails = new Set();
        let phoneNumbers = new Set();
        let secondaryContactIds = []; 
        if(existingContacts.length == 0){
            let queryResult = await helper.insertContact(email ,phoneNumber);
            await connection.commit();
            return resp.status(200).json({contact :{primaryContactId : queryResult.insertId , 
                emails : [email] , 
                phoneNumbers :[phoneNumber] ,
                 secondaryContactIds :[] }});
        }else{
            let primaryContact = existingContacts.filter(item => item.linkPrecedence === 'primary')
            primaryContactId = primaryContact[0]?.id ? primaryContact[0]?.id : existingContacts[existingContacts.length-1]?.linkedId
            let updateRequire = false;
            let updatedLinkedId = null;
            let linkedIdOrIdToBeUpdated = null;
            let secondaryContact = [];
            // 3 case --> 1 no primary, 2--->1 primary contacts, 3--> more than one primary contact
            if(primaryContact.length == 0 && email != null && phoneNumber != null){
                console.log('Filter secondary contact and check if the have same linked id if different get the primary and update accordingly')
                secondaryContact = existingContacts.filter(item => item.linkPrecedence === 'secondary')
                let {temp1LinkedId , temp2linkedId , temp1PrimaryContact , temp2PrimaryContact} = await helper.getPrimaryContactsForSecondary(secondaryContact)

                if(temp1LinkedId != null && temp2linkedId != null){
                    let result = helper.comparePrimaryContacts(temp1PrimaryContact , temp2PrimaryContact)
                    primaryContact = result.contact
                    updateRequire = true;
                    linkedIdOrIdToBeUpdated = result.idToUpdate
                    primaryContactId = primaryContact.id
                    updatedLinkedId = primaryContact.id
                }
                else if(temp1LinkedId != null && temp2linkedId == null){
                    primaryContact = await helper.getPrimaryContact(temp1LinkedId)
                    updateRequire = false;
                    primaryContactId = primaryContact[0].id
                    updatedLinkedId = null;
                    linkedIdOrIdToBeUpdated = null;
                }
            }
            else if(primaryContact.length == 1 && email != null && phoneNumber != null){
                console.log('Get secondary contact and check if they have same linked id if different get the primary and update accordingly')
                primaryContactId = primaryContact[0].id
                secondaryContact = existingContacts.filter(item => item.linkPrecedence === 'secondary')
                let primaryContactOfDifferentlinkedId = await helper.checkSecondaryContact(secondaryContact , primaryContactId)
                if(primaryContactOfDifferentlinkedId.length != 0){
                    let results  = comparePrimaryContacts(primaryContact , primaryContactOfDifferentlinkedId)
                    primaryContact = results.contact
                    primaryContactId = primaryContact.id
                    updatedLinkedId = primaryContact.id
                    linkedIdOrIdToBeUpdated = results.idToUpdate
                    updateRequire = true;
                }

            }
            else if(primaryContact.length > 1 && email != null && phoneNumber != null){
                console.log('Determine the primary coontacts get secondary contacts of both contacts and updte accordingly!.')
                if(primaryContact.length == 2){
                   let  temp1PrimaryContact = [primaryContact[0]]
                   let  temp2PrimaryContact = [primaryContact[1]]
                   let result = helper.comparePrimaryContacts(temp1PrimaryContact , temp2PrimaryContact)
                
                    updateRequire = true;
                    primaryContact = result.contact;
                    updatedLinkedId = primaryContact.id
                    linkedIdOrIdToBeUpdated = result.idToUpdate
                    primaryContactId = primaryContact.id
                
                }
                else{
                    return resp.status(500).json({'message' : 'More than 2 primary Contact exists'})
                   }
            }
            
            if(updateRequire){
                if(updatedLinkedId && linkedIdOrIdToBeUpdated){
                    await helper.updateContact(linkedIdOrIdToBeUpdated , updatedLinkedId , 'secondary')
                    
                }
            }


        }
        await connection.commit()
        let newResult = await helper.getContactsWithLinkedIdOrId(primaryContactId , primaryContactId)
        newResult.forEach(item => {
            emails.add(item.email)
            phoneNumbers.add(item.phoneNumber)
            if(item.linkPrecedence !== 'primary'){
               secondaryContactIds.push(item.id)
            }
        })

        if(email && phoneNumber){
            let emailExists = newResult.find(item => item.email === email) ? true : false
            let phoneNumberExists = newResult.find(item => item.phoneNumber === phoneNumber) ? true : false
            if(!emailExists || !phoneNumberExists){
                
                let result = await helper.insertContact(email , phoneNumber , primaryContactId , 'secondary')
                emails.add(email)
                phoneNumbers.add(phoneNumber)
                secondaryContactIds.push(result.insertId)
            }
        }
    
        await connection.commit()
        return resp.status(200).json({
            contact : {
                primaryContactId : primaryContactId ,
                emails : Array.from(emails),
                phoneNumbers : Array.from(phoneNumbers),
                secondaryContactIds : secondaryContactIds
            }
        })
        
     
        
    }
    catch(err){
        await connection.rollback()
        return resp.status(500).json({message:'Internal server error' , 'error':err})
    }finally{
        connection.release()
    }
}



module.exports = {identifyContact}

