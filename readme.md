Overview
This project involves creating a web service to help FluxKart.com identify and consolidate customer information across multiple orders. The service ensures that customer contacts (either email or phone number) are linked together based on shared information, allowing for a personalized customer experience without duplication.

Service Endpoint
The main endpoint of the service is /identify, which accepts POST requests with a JSON body containing customer contact information.

Request Format
The JSON body can include:

"email": A string representing the customer's email address.
"phoneNumber": A string representing the customer's phone number.