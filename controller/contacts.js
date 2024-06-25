const express = require('express')
const db = require('../db/db')


const getContacts = async (email , phoneNumber) => {
    const query = 'SELECT * FROM contact where email = ? or phoneNumber = ?   order by createdAt ASC';
    const [results] = await db.query(query , [email , phoneNumber]);
    return results;
}


const getContactsWithLinkedIdOrId = async(id , linkedId)  => {
    const query = "SELECT * from contact where id=? or linkedId=?"
    const [results] = await db.query(query , [id , linkedId])
    return results;
}

const getContactsWithLinkedId = async(linkedId)  => {
    const query = "SELECT * from contact where linkedId IN(?)"
    const [results] = await db.query(query , [linkedId])
    return results;
}

const getPrimaryContact = async (linkedId) => {
    const query = "SELECT * from contact where id=? and linkPrecedence = ?"
    const [results] = await db.query(query , [linkedId , 'primary'])
    return results;
}

const getSecondaryContacts = async (linkedId) => {
    const query = "SELECT * from contact where  linkedId = ? order by createdAt"
    const [results] = await db.query(query , [linkedId])
    return results;
}


const insertNewContact = async(email , phoneNumber) => {
    const query = "INSERT INTO contact(email , phoneNumber) values(?,?)"
    const [results] = await db.query(query , [email , phoneNumber])
    return results;
}

const insertSecondaryContact = async(email , phoneNumber , linkedId) => {
    const query = "INSERT INTO contact(email , phoneNumber , linkedId , linkPrecedence) values(?,?,?,?)"
    const [results] = await db.query(query , [email , phoneNumber , linkedId , 'secondary'])
    return results;
}


const updateContact = async (id , linkedId , linkPrecedence) => {
    const query = "UPDATE contact set linkedId = ? , linkPrecedence = ? where id = ?";
    await db.query(query , [linkedId , linkPrecedence , id]);
}




const identifyContact = async(req, resp) => {
    const {email , phoneNumber} = req.body
    if(!email && !phoneNumber){
        return resp.status(200).json({message:'Either email or phone number is required!'})
    }
    let connection;
    try{
        connection = await db.getConnection()
        await connection.beginTransaction()
        let result = await getContacts(email , phoneNumber)
        let primaryContactId = null;
        let emails = new Set()
        let phoneNumbers = new Set()
        let secondaryContactIds = []
        if(result.length == 0){
            let result = await insertNewContact(email , phoneNumber)        
            primaryContactId = result.insertId
        }else{
            // result is not empty
            let primaryContact = result.filter(item => item.linkPrecedence === 'primary')
            let secondaryContact = result.filter(item => item.linkPrecedence === 'primary');
            let id = null;
            if(primaryContact.length == 0){
                primaryContact = await getPrimaryContact(result[result.length-1].linkedId)
                primaryContactId = primaryContact[0].id
            }
            if(primaryContact.length > 1){
                let oldestContact = primaryContact[0]
                for(contact of primaryContact){
                    if(contact.createdAt < oldestContact.createdAt){
                        oldestContact = contact
                        break;
                    }
                }
                primaryContactId = oldestContact.id
                for(contact of primaryContact){
                    if(contact.id != oldestContact.id){
                        id = contact.id
                        await updateContact(contact.id , primaryContactId , 'secondary')
                        // check if secondary contact of this id exist in db if exist update that contacts also
                        let queryResult = await getContactsWithLinkedId(id)
                        if(queryResult.length > 0){
                            for(newcontact of queryResult){
                                await updateContact(newcontact.id , oldestContact.id ,'secondary')
                            }
                        }
                    }
                }

            }
            if(primaryContact.length === 1){
                
                primaryContactId = primaryContact[0].id
                let linkedId = null;                
                let queryResult = null;
                for(contact of result){
                    if((contact.linkedId != primaryContactId) && contact.linkPrecedence !== 'primary'){
                        linkedId = contact.linkedId
                        queryResult = await getContactsWithLinkedIdOrId(linkedId , linkedId)
                        break;
                    }
                }
                
                if(queryResult!=null && queryResult?.length > 0 ){
                    for(newcontact of queryResult){
                        await updateContact(newcontact.id , primaryContactId , 'secondary')
                    }
                }
                console.log('Outside for')
                secondaryContact = await getSecondaryContacts(primaryContactId)
                for(const contact of secondaryContact){
                    if(contact.linkedId != primaryContactId){
                        await updateContact(contact.id , primaryContactId , 'secondary')
                    }
                }
                
            }
        }
        
        let newResult = await getContactsWithLinkedIdOrId(primaryContactId , primaryContactId)

        
        let flag = false
        let insertId = null
        if(email != null && phoneNumber != null){
            let emailExists = newResult.find(item => item.email === email) ? true : false
            let phoneNumberExists = newResult.find(item => item.phoneNumber === phoneNumber) ? true : false
            if(!emailExists || !phoneNumberExists){
                let result = await insertSecondaryContact(email , phoneNumber , primaryContactId)
                insertId = result.insertId
                flag = true
            }
        }
        
        newResult.forEach(item => {
            emails.add(item.email)
            phoneNumbers.add(item.phoneNumber)
            if(item.linkPrecedence === 'secondary'){
                secondaryContactIds.push(item.id)
            }
        });
        if(flag){
            emails.add(email)
            phoneNumbers.add(phoneNumber)
            secondaryContactIds.push(insertId)
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


