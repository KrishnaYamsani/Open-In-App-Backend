require('dotenv').config();
const twilio = require('twilio');
const pg = require('pg');
const pool = require('./db');
const { Client } = require('twilio/lib/base/BaseTwilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = new Client(accountSid,authToken);


async function fetchTasks() {
    
    try {
        let result = await pool.query('SELECT task.id, task.due_date, users_details.phonenumber FROM task INNER JOIN users_details ON task.user_id = users_details.id WHERE task.due_date < CURRENT_DATE ORDER BY task.priority ASC;');
        result=result.rows;
        return result;
    }catch(err){
        console.error(err);
    }
}

async function fetchUserById(userId){
    try{
        const result = await pool.query(`SELECT * FROM users_details WHERE ID=$1;`,[userId]);
        return result.rows[0];
    }catch(err){
        console.error(err);
    }
}

async function makeVoiceCall(userId, taskTitle) {
    try {
        const user = await fetchUserById(userId); 
        const phoneNumber = user.phone_number; 
        
       
        await client.calls.create({
            twiml: `<Response><Say>Hello, this is a reminder about your task: ${taskTitle}</Say></Response>`,
            to: phoneNumber,
            from: process.env.TWILIO_ACCOUNT_PHONE_NUMBER
        });

        console.log(`Voice call made to user ${userId}`);
    } catch (error) {
        console.error('Error making voice call:', error);
    }
}

module.exports = {fetchTasks,makeVoiceCall};
