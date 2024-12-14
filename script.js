#!/usr/bin/env node

const inquirer = require('inquirer');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const prompt = inquirer.createPromptModule();
const fs = require("fs");
const path = require("path");

const folders = [
    'controllers',
    'routes',
    'models',
    'utilities',
    'middlewares',
    'uploads'
];

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const getAnswers = async () => {
    return await prompt([
        { 
            type: 'input', 
            name: 'authorization', 
            message: 'Will your project contain authorization? (y/n)', 
            validate: (input) => {
                input = input.toLowerCase();
                if (input == 'y' || input == "yes" || input == 'n' || input == "no") {
                    return true;
                }
                return "Please answer with yes or no.";
            }
        },
        { 
            type: 'input', 
            name: 'validation', 
            message: 'Will your project contain validation folder? (y/n)',
            validate: (input) => {
                input = input.toLowerCase();
                if (input == 'y' || input == "yes" || input == 'n' || input == "no") {
                    return true;
                }
                return "Please answer with yes or no.";
            }
        },
        { 
            type: 'input', 
            name: 'models', 
            message: 'How many models do you have?', 
            validate: (input) => {
                const number = parseInt(input, 10);
                if (isNaN(number) || number < 0) {
                    return 'Please enter a valid non-negative number.';
                }
                return true;
            }
        }
    ]);
};

const getModels = (quantity) => {
    const models = parseInt(quantity, 10);
    const modelPrompts = [];
    for (let i = 1; i <= models; i++) {
        modelPrompts.push({
            type: 'input',
            name: `model${i}`,
            message: `Enter the name of model ${i}:`
        });
    }
    return modelPrompts;
};

const addModelsToAnswer = async (modelPrompts, answers) => {
    const modelAnswers = await prompt(modelPrompts);
    return { ...answers, models: modelAnswers };
};

const runCommand = async (command) => {
    try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr) {
            throw new Error(stderr);
        }
        return stdout;
    } catch (error) {
        throw new Error(`Error executing command: ${error.message}`);
    }
};

const installDependencies = async (allAnswers) => {
    console.log("Initializing new Node.js project...");
    const npmInitiationResult = await runCommand('npm init -y');
    console.log(npmInitiationResult);

    console.log("Installing Express...");
    const installingExpressResult = await runCommand('npm i express');
    console.log(installingExpressResult);

    console.log("Installing Mongoose...");
    const installingMongooseResult = await runCommand('npm i mongoose');
    console.log(installingExpressResult);

    console.log("Installing dotenv...");
    const installingDotenvResult = await runCommand('npm i dotenv');
    console.log(installingDotenvResult);

    console.log("Installing CORS...");
    const installingCorsResult = await runCommand('npm i cors');
    console.log(installingCorsResult);

    console.log("Installing Multer...");
    const installingMulterResult = await runCommand('npm i multer');
    console.log(installingMulterResult);

    if (allAnswers.authorization.toLowerCase() == 'y' || allAnswers.authorization.toLowerCase() == "yes") {
        console.log("Installing JWT...");
        const installingJwtResult = await runCommand('npm i jsonwebtoken');
        console.log(installingJwtResult);

        console.log("Installing argon2...");
        const installingArgon2Result = await runCommand('npm i argon2');
        console.log(installingArgon2Result);
    }
}

const createInitialFiles = async (allAnswers) => {
    const currentDir = process.cwd();
    const envContent = `
PORT = ""
DB = ""
ADMIN = ""
USER = ""
JWTKEY = ""
    `.trim();

    const gitignoreContent = `
./node_modules/
./env
    `.trim();

    try {
        await fs.promises.writeFile(path.join(currentDir, '.env'), envContent);
        console.log('.env file created successfully.');
        await fs.promises.writeFile(path.join(currentDir, "index.js"), indexContent);
        console.log('index.js file created successfully.');
        const gitignorePath = path.join(currentDir, '.gitignore');
        if (!fs.existsSync(gitignorePath)) {
            await fs.promises.writeFile(gitignorePath, gitignoreContent);
            console.log('.gitignore file created successfully.');
        } else {
            const existingContent = await fs.promises.readFile(gitignorePath, 'utf8');
            if (!existingContent.includes('./env')) {
                await fs.promises.appendFile(gitignorePath, '\n./env');
                console.log('.env added to .gitignore.');
            } else {
                console.log('.env is already in .gitignore.');
            }
        }
    } catch (error) {
        console.error('Error creating .env or .gitignore files:', error);
    }
}

const createInitialFolders = async (allAnswers) => {
    let validationFolder = false;
    const currentDir = process.cwd();
    if (allAnswers.validation.toLowerCase() == 'y' || allAnswers.validation.toLowerCase() == "yes") {
        validationFolder = true
    }
    if (validationFolder) {
        folders.push("validations");
    }
    folders.forEach(folder => {
        const folderPath = path.join(currentDir, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
            console.log(`${folder} folder created.`);
        } else {
            console.log(`${folder} folder already exists.`);
        }
    });
}

const createMainFiles = async (allAnswers) => {
    let models = Object.keys(allAnswers.models);
    const currentDir = process.cwd();
    for (let i = 0; i < models.length; i++) {
        const model = allAnswers.models[models[i]];
        const lowerCaseModel = model.toLowerCase();
        const capitalizedModel = capitalize(model);
        for (let j = 0; j < folders.length; j++) {
            const folder = folders[j];
            const workingDir = path.join(currentDir, folder);
            if (folder == "models") {
                const modelContent = `
const mongoose = require("mongoose");

const ${lowerCaseModel}Schema = new mongoose.Schema({
    
})

const ${capitalizedModel} = mongoose.model("${capitalizedModel}", ${lowerCaseModel}Schema);

module.exports = ${capitalizedModel};
                `.trim();
                await fs.promises.writeFile(path.join(workingDir, `${lowerCaseModel}.js`), modelContent);
                console.log(`${lowerCaseModel}.js created successfully.`);
            }
            else if (folder == "controllers") {
                const controllerContent = `
const ${capitalizedModel} = require("./../models/${lowerCaseModel}");
const msgs = require("./../utilities/responseMessages");
const {validationResult} = require("express-validator");

const name = async (req, res) => {
    try {
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: msgs.FAIL,
            Data: error
        })
    }
}

module.exports = {
    name,
}
                `.trim();
                await fs.promises.writeFile(path.join(workingDir, `${lowerCaseModel}Controllers.js`), controllerContent);
                console.log(`${lowerCaseModel}Controllers.js created successfully.`);
            }
            else if (folder == "routes") {
                const routeContent = `
const express = require("express");
const router = express.Router();
const ${lowerCaseModel}Controllers = require("./../controllers/${lowerCaseModel}Controllers");
const multer = require("./../utilities/configurations/multerConfigurations");
const ${lowerCaseModel}Validations = require("./../validations/${lowerCaseModel}Validations")
const ${lowerCaseModel}Middlewares = require("./../middlewares/${lowerCaseModel}Middlewares")

router.post("/", ${lowerCaseModel}Controllers.name)

module.exports = router;
                `.trim();
                await fs.promises.writeFile(path.join(workingDir, `${lowerCaseModel}Routes.js`), routeContent);
                console.log(`${lowerCaseModel}Routes.js created successfully.`);
            }
            else if (folder == "validations") {
                const validationContent = `
const {body} = require("express-validator");
const ${capitalizedModel} = require("./../models/${lowerCaseModel}");

const nameValidation = () => {
    return [
        
    ]
}

module.exports = {
    nameValidation,
}
                `.trim();
                await fs.promises.writeFile(path.join(workingDir, `${lowerCaseModel}Validations.js`), validationContent);
                console.log(`${lowerCaseModel}Validations.js created successfully.`);
            }
            else if (folder == "middlewares") {
                const middlewareContent = `
const name = async (req, res) => {
    try {
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: msgs.FAIL,
            Data: error
        })
    }
}

module.exports = {
    
}
                `.trim();
                await fs.promises.writeFile(path.join(workingDir, `${lowerCaseModel}Middlewares.js`), middlewareContent);
                console.log(`${lowerCaseModel}Middlewares.js created successfully.`);
            }
        }
    }
    if (allAnswers.authorization.toLowerCase() == 'y' || allAnswers.authorization.toLowerCase == "yes") {
        const authorizationContent = `
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");

const checkToken = (req, res, next) => {
    try {
        let token = req.cookies?.jwt
        if(!token){
            throw("Please Login")
        }
        jwt.verify(token, process.env.JWTKEY)
        next()
    } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: msgs.FAIL,
            Data: error
        })
    }
}

// const register = async (req, res) => {
//     try {
//         let newUser = req.body
//         let validationErrors = validationResult(req)
//         if (!validationErrors.isEmpty()) {
//             throw(validationErrors)
//         }
//         let hashedPassword = await argon2.hash(newUser.password, 6)
//         await user.create({...newUser, password : hashedPassword})
//         res.status(200).json({
//             msg: "Registered"
//         })
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({
//             msg: msgs.FAIL,
//             Data: error
//         })
//     }
// }

// const login = async (req, res) => {
//     try {
//         let newLogin = req.body
//         let getUser = await user.findOne({email : newLogin.email})
//         if (!getUser) {
//             throw("User Not Found")
//         }
//         let checkPassword = await argon2.verify(getUser.password, newLogin.password)
//         if (!checkPassword) {
//             throw("Wrong Password")
//         }
//         let token = jwt.sign({
//             name: getUser.name
//         }, process.env.JWTKEY)

//         res.cookie("jwt", token, {
//             expires: new Date(Date.now() + 0.5 * 60 * 1000)
//         }).json({
//             status: "success",
//             // status: responseMsgs.SUCCESS,
//             data: "Welcome"
//         })
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({
//             msg: msgs.FAIL,
//             Data: error
//         })
//     }
// }

module.exports = {
    checkToken,
    // login,
    // register
}
        `.trim();
        await fs.promises.writeFile(path.join(path.join(currentDir, "middlewares"), `authorizationMiddlewares.js`), authorizationContent);
        console.log(`authorizationMiddlewares.js created successfully.`);
    }
}

const createUtilitiesFiles = async _ => {
    const currentDir = process.cwd();
    const utilitiesFolder = path.join(currentDir, "utilities");
    const configurationFolder = path.join(utilitiesFolder, "configurations");
    if (!fs.existsSync(configurationFolder)) {
        fs.mkdirSync(configurationFolder);
        console.log(`configurations folder created.`);
    } else {
        console.log(`configurations folder already exists.`);
    }

    const DatabaseContent = `
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = async _=>{
    await mongoose.connect(process.env.DB);
    console.log("DB is connected");
}

module.exports = connectDB;
    `.trim();

    const multerContent = `
const multer = require("multer");
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads");
    },
    filename: (req, file, cb) => {
        let name = Date.now() + "-" + Math.round(Math.random() * 100000) + file.originalname;
        cb(null, name);
    },
});

const upload = multer({ storage: storage });
module.exports = upload;
    `.trim();

    const responseMsgsContent = `
exports.SUCESS = "success";
exports.FAIL = "fail";
    `.trim();

    await fs.promises.writeFile(path.join(configurationFolder, "DBConfigurations.js"), DatabaseContent);
    console.log(`DBConfigurations.js created successfully.`);
    await fs.promises.writeFile(path.join(configurationFolder, "multerConfigurations.js"), multerContent);
    console.log(`multerConfigurations.js created successfully.`);
    await fs.promises.writeFile(path.join(utilitiesFolder, "responseMessages.js"), responseMsgsContent);
    console.log(`responseMessages.js created successfully.`);
}

const createIndexFile = async (allAnswers) => {
    const currentDir = process.cwd();
    let credentials = false;
    if (allAnswers.authorization.toLowerCase() == 'y' || allAnswers.authorization.toLowerCase() == "yes") {
        credentials = true;
    }
    const modelIncludes = Object.values(allAnswers.models)
        .map(model => `const ${model.toLowerCase()}Routes = require("./routes/${model.toLowerCase()}Routes");`)
        .join('\n');
    const modelRoutes = Object.values(allAnswers.models)
        .map(model => `app.use('/${model.toLowerCase()}', ${model.toLowerCase()}Routes);`)
        .join('\n');
    const indexContent = `
const express = require("express");
const app = express();
const DBConnect = require("./utilities/configurations/DBConfigurations");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
${modelIncludes}

(async function() {
    await DBConnect();
    app.listen(process.env.PORT, _=>{
        console.log("Server started");
    })
})();

app.use(cors({
    origin:[ process.env.ADMIN, process.env.USER ],
    credentials: ${credentials}
}))

app.use("/uploads", express.static("uploads"));
app.use(express.json());
${modelRoutes}
    `.trim();

    await fs.promises.writeFile(path.join(currentDir, "index.js"), indexContent);
    console.log('index.js file created successfully.');
}

(async () => {
    try {
        const answers = await getAnswers();
        const modelPrompts = getModels(answers.models);
        const allAnswers = await addModelsToAnswer(modelPrompts, answers);
        console.log("Your project setup:", allAnswers);
        installDependencies(allAnswers);
        createInitialFiles(allAnswers);
        createInitialFolders(allAnswers);
        createMainFiles(allAnswers);
        createUtilitiesFiles();
        createIndexFile(allAnswers);
    } catch (error) {
        console.error('An error occurred:', error);
    }
})();