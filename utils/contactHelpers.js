const db = require('../db/db')

const getContacts = async (email , phoneNumber) => {
    const query = 'SELECT * FROM contact where email = ? or phoneNumber = ? order by createdAt ASC';
    const [results] = await db.query(query , [email , phoneNumber , 'primary']);
    return results;
}

const getPrimaryContact = async(id)  => {
    const query = "SELECT * from contact where id=? "
    const [results] = await db.query(query , [id])
    return results;
}

const getContactsWithLinkedIdOrId = async(id , linkedId)  => {
    const query = "SELECT * from contact where id=? or linkedId=?"
    const [results] = await db.query(query , [id , linkedId])
    return results;
}


const insertContact = async (email, phoneNumber, linkedId = null, linkPrecedence = 'primary') => {
    const query = "INSERT INTO contact(email, phoneNumber, linkedId, linkPrecedence) VALUES(?, ?, ?, ?)";
    const [results] = await db.query(query, [email, phoneNumber, linkedId, linkPrecedence]);
    return results;
};

const updateContact = async (id, linkedId, linkPrecedence) => {
    const query = "UPDATE contact SET linkedId = ?, linkPrecedence = ? WHERE id = ? or linkedId=?";
    await db.query(query, [linkedId, linkPrecedence, id,id]);
};


const comparePrimaryContacts = (primaryContact, primaryContactOfDifferentlinkedId) => {
    if (primaryContact[0].createdAt < primaryContactOfDifferentlinkedId[0].createdAt) {
        return {
            contact: primaryContact[0],
            idToUpdate: primaryContactOfDifferentlinkedId[0].id
        };
    } else {    
        return {
            contact: primaryContactOfDifferentlinkedId[0],
            idToUpdate: primaryContact[0].id
        };
    }
};


const checkSecondaryContact = async (secondaryContact , primaryContactId) => {
    let primaryContactOfDifferentlinkedId =[]
    for(contact of secondaryContact){
        if(contact.linkedId != primaryContactId){
            primaryContactOfDifferentlinkedId = await getPrimaryContact(contact.linkedId)
            break;
        }
    }
    return primaryContactOfDifferentlinkedId
}


const getPrimaryContactsForSecondary = async(secondaryContact) => {
    let temp1LinkedId = secondaryContact[0]?.linkedId
    let temp2linkedId = null;
    let temp1PrimaryContact = [];
    let temp2PrimaryContact = []
    for(let contact of secondaryContact){
        if(contact.linkedId != temp1LinkedId){
            temp2linkedId = contact.linkedId
            break;
        }
    }
    if(temp1LinkedId){
        temp1PrimaryContact = await getPrimaryContact(temp1LinkedId)
    }
    if(temp2linkedId){
        temp2PrimaryContact = await getPrimaryContact(temp2linkedId)
    }
    return {temp1LinkedId , temp2linkedId , temp1PrimaryContact , temp2PrimaryContact};
}

module.exports = {getContacts,
    getPrimaryContact ,
    getContactsWithLinkedIdOrId,
    insertContact,
    updateContact, 
    comparePrimaryContacts,
    checkSecondaryContact,
    getPrimaryContactsForSecondary
}