
Background steps

2. Get Freeslot of a particular user (these are kind of like owners) and screach for free slots so we can book the lead, we need their calendar to do this

Webhook
Contact:
1. When a contact is created, we need to look at the params given by GHL, with the params we can get their userId (GHL edition), with this we will use
this id instead of the database one whenever we need to talk to a user

Right now it gets the user by locationId(THIS USUALLY MEANS SUBACCOUNT INVESTIGATE THIS)
we need to verify if locationId equals userId or is it for subaccounts

IMPORTANT: We need an identifier for users/clients/owners whatever you call them


2. For strategies, users can have multiple, consider adding a "favorite" strategy system (this will be "kind of" complex "not really I just dont want to add it lol" ) but for now just use the first created one for webhooks related to that particular user

4. we then create a new lead and send him a message (this will just be the standard /chat call)

Outbound: (this is genuinely one of the more easier flows)
Leads are actively sending us messages. 
All we need is the lead id, it will give us the nice stream of conservation.

Booking: (one of the more complex flows)

So we can get the bot to successfully book meeting into our database.
We can have an action running off that, this action will simply call GHL API
and we will be able to book through them.


contact created
outbound (continuous messaging until done)
booking