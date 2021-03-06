import express from 'express'
import validator from 'validator'
import xssFilters from 'xss-filters'
import Mailgun from 'mailgun-js'

const API_KEY = process.env.MAILGUN_KEY;
const DOMAIN = 'marmt.io';
const app = express()

const validateAndSanitize = (key, value) => {
    const rejectFunctions = {
        name: v => v.length < 4,
        email: v => !validator.isEmail(v),
        company: v => v.length < 3,
        message: v => v.length < 25
    }

    // If object has key and function returns false, return sanitized input. Else, return false
    return rejectFunctions.hasOwnProperty(key) && !rejectFunctions[key](value) && xssFilters.inHTMLData(value)
}

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.json())

app.post('*', (req, res) => {
    const attributes = ['name', 'email', 'company', 'message']
    const sanitizedAttributes = attributes.map(n => validateAndSanitize(n, req.body[n]))
    const someInvalid = sanitizedAttributes.some(r => !r)

    if (someInvalid) {
        return res.status(422).json({ 'error': 'Ugh.. That looks unprocessable!' })
    }

    const mailgun = new Mailgun({ apiKey: API_KEY, domain: DOMAIN })

    const emailData = {
        from: 'admin@marmt.io',
        subject: 'New Marmt Inquiry from ' + req.body.company,
        text: req.body.message,
        html: '<p>Message from: ' + req.body.name + ': ' + req.body.message + '</p>',
        to: 'davidjamesdavis.djd@gmail.com',
        'h:Reply-To': req.body.email 
    }

    const mailResponse = async () => {
        await mailgun.messages()
            .send(emailData, (error, body) => {
                if (error) {
                    res.status(500).send('Something broke!')
                    console.log("got an error: ", error);
                }
                res.status(200).send('Email sent!')
                console.log(body)
                
            });
    }
    mailResponse()

})

export default app