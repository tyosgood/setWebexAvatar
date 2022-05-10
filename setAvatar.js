var axios = require('axios')

const args = process.argv.slice(2)
const auth_token = args[0]

let baseURL
//url of the image to use for the avatar - link below is a logo for SSA
const avatarUrl = 'https://avatar-us-gov-west-1.s3.us-gov-west-1.amazonaws.com/Avtr~V1~37a1930e-1a4d-4101-84e9-13727649912f/V1~ae186ded69e93623ee44a44d1eda12da3555ec26956390de9e657aad2c4ab8e2~a5bd8a1deff046148c0da11a4ea6b56a~1600'

//specify any user search terms here - format should be ?displayName=joe
const searchModifier =''

//default to Fedramp but look for the -c as the 2nd arg to run against a commercial webex site
if (args[1] && args[1] === '-c') {
    baseURL = 'https://webexapis.com/v1';
    console.log('FedRAMP Mode')
  } else {
    baseURL = 'https://api-usgov.webex.com/v1';
  };
console.log('Your Auth Token is: ', auth_token)

//create axios instance using either fedramp or commercial api endpoint as base url
const instance = axios.create({
  baseURL: baseURL,
  headers: { 
    'Authorization': 'Bearer ' + auth_token,
    'Content-Type': 'application/json'}
});


changeAvatars();

async function changeAvatars() {
    try {
        //get list of all the users  (note this does not yet handle multiple pages of output)
        const response = await instance.get('/people/'+searchModifier);
        const users = response.data;
        const promiseArray = [];

        for (var x in users.items) {
            //get each user's details
            promiseArray.push(instance.get('/people/' + users.items[x].id));
            console.log('Requested '+ users.items[x].displayName)

            //pause here on each user to avoid 429 (Too many requests) errors
            await new Promise(resolve => setTimeout(resolve, 500));
        };

        // promise.all allows you to make multiple axios requests at the same time.
        // It returns an array of the results of all your axios requests
        try{
            let resolvedPromises = await Promise.all(promiseArray)

            for (let i = 0; i < resolvedPromises.length; i++) {
                // This will give you access to the output of each API call
                //console.log(resolvedPromises[i])
                console.log('Retrieved '+ resolvedPromises[i].data.displayName)
                
                //set user's avatar to avatarUrl
                resolvedPromises[i].data.avatar = avatarUrl    

                //PUT call to update the avatar for the users
                await instance.put('people/' + resolvedPromises[i].data.id, resolvedPromises[i].data)
                console.log ('Updated Avatar for '+ resolvedPromises[i].data.displayName)
            }
            
        }
        catch(err){
            console.log('Something went wrong updating the avatars - ' + err);
        }
    } catch (err) {
        console.log('Something went wrong retrieving the users / user details - ' + err);
    }
}