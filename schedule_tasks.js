const cron = require('node-cron');
const pg = require('pg');
const pool = require('./db');
const calls = require('./calls');

const change_priorities = cron.schedule('0 8 * * *',() => {
    try{
        const result = pool.query("CALL update_task_priority_due_date();");
    }catch (err){
        console.error("Error:" + err.message);
    }
},{
    scheduled: true,
    timezone: "Asia/Kolkata"
});

const make_call = cron.schedule('30 9 * * *', async () => {
    try {
      const tasks = await calls.fetchTasks();

      if(!tasks){
        return;
      }
  
      for (const task of tasks) {
        
        if (!task.called || !task.responded) {
          await makePhoneCall(task.phone_number, `Hello! This is a reminder about your task.`);
          break;
        }
      }
    } catch (error) {
      console.error('Error in cron job:', error);
    }
  },{
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

module.exports = {make_call,change_priorities};
  

