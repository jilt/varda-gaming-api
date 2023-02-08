const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path')
const logger = async (newUser, logFileName) => {
    try {
        // Checking if the file exists
        if(!fs.existsSync(path.join(__dirname, '..', logFileName))) {
            await fsPromises.writeFile(path.join(__dirname, '..', logFileName), '', 'utf8', (err) => {
                if(err) throw err;
                console.log({ err })
            });
        }

        const fileData = fs.readFileSync(path.join(__dirname, '..', logFileName), 'utf8');
        // If the file is empty we init it with users array;
        let data = fileData ? JSON.parse(fileData) : { users: [] }

        //Pushing new registered user
        data.users.push(newUser)

        //Updating the JSON 
        fs.writeFile(path.join(__dirname, '..', logFileName), JSON.stringify(data, null, 4), 'utf8', err => {
            if (err) {
                console.log(`Error writing file: ${err}`)
                throw err
            }
        })
    } catch(err) {
        console.log(err);
        throw err
    }
}

module.exports = logger