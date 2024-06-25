let button = document.getElementById('get_details')
button.addEventListener('click',async ()=> {
    let email = document.getElementById('email_address').value
    let phoneNumber = document.getElementById('phone_number').value
    let data = {
        email : email,
        phoneNumber : phoneNumber
    }
    let url = 'https://fluxkart-3bde.onrender.com/api/identify'
    let resp = await fetch(url , {
        method : 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body : JSON.stringify(data)
    })
    resp = await resp.json()
    updateTable(resp);
    function updateTable(data) {
        let tableBody = document.getElementById('data_body');
        tableBody.innerHTML = ''; // Clear any existing rows
        let contact = data.contact;
        let primaryRow = document.createElement('tr');
        
        let primaryIdCell = document.createElement('td');
        primaryIdCell.textContent = contact.primaryContactId;
        primaryRow.appendChild(primaryIdCell);

        let emailCell = document.createElement('td');
        emailCell.innerHTML = contact.emails.join('<br>');
        primaryRow.appendChild(emailCell);

        let phoneCell = document.createElement('td');
        phoneCell.innerHTML = contact.phoneNumbers.join('<br>');
        primaryRow.appendChild(phoneCell);

        let secondaryIdsCell = document.createElement('td');
        secondaryIdsCell.innerHTML = contact.secondaryContactIds.join('<br>');
        primaryRow.appendChild(secondaryIdsCell);

        tableBody.appendChild(primaryRow);
    }
})