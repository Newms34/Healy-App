#!/usr/bin/env node

const chalk = require('chalk'),
    prompt = require('prompts'),
    { google } = require('googleapis'),
    rimraf = require('rimraf'),
    path = require('path')
    fs = require('fs');
console.log('CWD',__dirname)
console.log(chalk.bgGreen.black('==========  Healy App Generator v1.0  =========='));
// fs.readdir('./potato',s=>console.log('yay',s),e=>console.log('O SHIT',e))
const main = async () => {
    let appName = await prompt({
        type: 'text',
        name: 'name',
        initial: 'myAwesomeApp',
        message: `First things first. What's your app called?`
    });

    while (!!appName.name.match(/[^\w]/)) {
        console.log(chalk.bgRedBright.black(' Error!: '), 'Your app name must consist only of alphanumeric symbols (A-Z, a-z, and 0-9)!')
        appName = await prompt({
            type: 'text',
            name: 'name',
            initial: 'myAwesomeApp',
            message: `First things first. What's your app called?`
        });
    }

    const initQs = [{
        type: 'text',
        name: 'baseFolder',
        initial: process.cwd()+'\\testApp',
        message: 'Enter a base folder to create your app in.'
    }, {
        type: 'toggle',
        name: 'useGoogle',
        initial: false,
        active: 'Yes',
        inactive: 'No',
        message: 'Would you like to include Google login functionality?'
    }, {
        type: 'select',
        name: 'frontEnd',
        message: 'Would you like to include a front-end framework?',
        choices: [
            { title: 'No framework (Vanilla JS)', value: 'None' },
            { title: 'AngularJS', value: 'angularjs' },
            { title: 'VueJS', value: 'vuejs' },
            { title: 'ReactJS', value: 'reactjs' }
        ]
    }]
    const respOne = await prompt(initQs),
        keysConf = JSON.parse(fs.readFileSync(path.join(__dirname,'src/config/keys.json'), 'utf-8'));
    
    // return console.log(keysConf);


    //create our initial directories
    if (!fs.existsSync(respOne.baseFolder)) {
        fs.mkdirSync(respOne.baseFolder);
    }
    ['build', 'config', 'models', 'routes', 'views'].forEach(f => {

        rimraf.sync(`${respOne.baseFolder}/${f}`)
        fs.mkdirSync(`${respOne.baseFolder}/${f}`);
    })
    fs.mkdirSync(`${respOne.baseFolder}/routes/subroutes`);

    let passportConf = fs.readFileSync(path.join(__dirname,'src/config/passport-setup.js'), 'utf-8'),
        respTwo = null;
    if (respOne.useGoogle) {
        const googQs = [{
            type: 'text',
            name: 'googId',
            message: 'Enter a Google client ID.'
        }, {
            type: 'text',
            name: 'googSec',
            message: 'Enter a Google Secret'
        }]
        const tempRedir = 'https://htgeo.herokuapp.com/';
        respTwo = await prompt(googQs);
        //now overwrite the Google Credentials in the keys.json file
        keysConf.google.clientID = respTwo.googId
        keysConf.google.secret = respTwo.googSec;
    } else {
        //no google; remove google strategy stuff
        const gstart = passportConf.indexOf('//begin Google'),
            gend = passportConf.indexOf('//end Google') + 12;
        passportConf = passportConf.slice(0, gstart) + passportConf.slice(gend);
    }
    fs.writeFileSync(`${respOne.baseFolder}/config/passport-setup.js`, passportConf, 'utf-8')
    fs.writeFileSync(`${respOne.baseFolder}/config/keys.json`, JSON.stringify(keysConf), 'utf-8')
    console.log(chalk.green('☻'), ' ', chalk.bgBlueBright.black('  Configuration files done!  '))
    const mongoQs = [{
        type: 'text',
        name: 'mongoExe',
        message: `Tell us the location of your ${chalk.gray('mongod.exe')} executable!`,
        initial: 'C:\\Program Files\\MongoDB\\Server\\4.2\\bin'
    }, {
        type: 'text',
        name: 'mongoStore',
        message: 'Where are you saving your MongoDB data?',
        initial: 'c:\\mongodata'
    }],
        mongoResps = await prompt(mongoQs);

    //gulpfile.js
    const gulpStr = fs.readFileSync(path.join(__dirname,'src/gulpfile.js'), 'utf-8')
        .replace('MONGO-EXE-URL', mongoResps.mongoExe.replace(/\\/g, '\\\\'))
        .replace('MONGO-STORE-URL', mongoResps.mongoStore.replace(/\\/g, '\\\\'));
    fs.writeFileSync(`${respOne.baseFolder}/gulpfile.js`, gulpStr, 'utf-8')
    console.log(chalk.green('☻'), ' ', chalk.bgBlueBright.black('  Gulp file written!  '))

    //app.js
    const appJs = fs.readFileSync(path.join(__dirname,'src/app.js'), 'utf-8').replace(new RegExp('MY-APP-NAME', 'g'), appName.name);
    fs.writeFileSync(`${respOne.baseFolder}/app.js`, appJs, 'utf-8')
    console.log(chalk.green('☻'), ' ', chalk.bgBlueBright.black('  app.js file written!  '))

    //package.json
    const packageJson = fs.readFileSync(path.join(__dirname,'src/package.json'), 'utf-8').replace('MY-APP-NAME-TITLE', appName.name.toLowerCase()).replace('MY-APP-NAME-DESC', appName.name);
    fs.writeFileSync(`${respOne.baseFolder}/package.json`, packageJson, 'utf-8')
    console.log(chalk.green('☻'), ' ', chalk.bgBlueBright.black('  package.json written!  '))

    //models
    //copy user model, since that's not really changed
    if (!fs.existsSync(`${respOne.baseFolder}/models/users`)) {
        fs.mkdirSync(`${respOne.baseFolder}/models/users`);
    }
    fs.copyFileSync(path.join(__dirname,'src/models/users/index.js'), `${respOne.baseFolder}/models/users/index.js`);

    const modelRoot = fs.readFileSync(path.join(__dirname,'src/models/index.js'), 'utf-8'),//so we can add our models
        modelTemplate = fs.readFileSync(path.join(__dirname,'src/models/modelTemplate.js'), 'utf-8')
    models = [];
    let addModels = await prompt({
        type: 'text',
        name: 'newMongoModel',
        message: `Add another MongoDB model (or leave blank to stop adding).`
    });
    while (!!addModels.newMongoModel) {
        //add model here!
        models.push(addModels.newMongoModel);
        addModels = await prompt({
            type: 'text',
            name: 'newMongoModel',
            message: `Add another MongoDB model (or leave blank to stop adding).`
        })
    }
    const addToModelInd = models.map(mn => {
        if (!fs.existsSync(`${respOne.baseFolder}/models/${mn}`)) {
            fs.mkdirSync(`${respOne.baseFolder}/models/${mn}`);
        }
        fs.writeFileSync(`${respOne.baseFolder}/models/${mn}/index.js`, modelTemplate.replace(new RegExp('ModelName', 'g'), mn), 'utf-8');
        return `require('./${mn}')\n`;
    }).join('');
    fs.writeFileSync(`${respOne.baseFolder}/models/index.js`, modelRoot.replace('ADD_MODELS', '\n' + addToModelInd), 'utf-8');

    console.log(chalk.green('☻'), ' ', chalk.bgBlueBright.black('  Models written!  '))

    //routes
    //copy user route, since that's not really changed
    if (!fs.existsSync(`${respOne.baseFolder}/routes/subroutes/users`)) {
        fs.mkdirSync(`${respOne.baseFolder}/routes/subroutes/users`);
    }
    fs.copyFileSync(path.join(__dirname,'src/routes/subroutes/users/index.js'), `${respOne.baseFolder}/routes/subroutes/users/index.js`);

    const routeRoot = fs.readFileSync(path.join(__dirname,'src/routes/index.js'), 'utf-8'),//so we can add our models
        routeTemplate = fs.readFileSync(path.join(__dirname,'src/routes/routeTemplate.js'), 'utf-8')
    routes = [];
    let addRoute = await prompt({
        type: 'text',
        name: 'newRoute',
        message: `Add another subroute folder (or leave blank to stop adding).`
    });
    while (!!addRoute.newRoute) {
        //add model here!
        routes.push(addRoute.newRoute);
        addRoute = await prompt({
            type: 'text',
            name: 'newRoute',
            message: `Add another subroute folder (or leave blank to stop adding).`
        })
    }
    const addToRouteInd = routes.map(mn => {
        if (!fs.existsSync(`${respOne.baseFolder}/routes/subroutes/${mn}`)) {
            fs.mkdirSync(`${respOne.baseFolder}/routes/subroutes/${mn}`);
        }
        fs.writeFileSync(`${respOne.baseFolder}/routes/subroutes/${mn}/index.js`, routeTemplate, 'utf-8');
        return `router.use('/user', require('./subroutes/${mn}')(io,mongoose));\n`;
    }).join('');
    fs.writeFileSync(`${respOne.baseFolder}/routes/index.js`, routeRoot.replace('ADD_ROUTES', '\n' + addToRouteInd), 'utf-8');
}
main();