require('dotenv').config();
const express = require('express');
const bodyparser = require('body-parser');
const pg = require('pg');
const auth_jwt = require('./jwt');
const pool = require('./db');
const {make_call,change_priorities} = require('./schedule_tasks');
const app = express();



// DB connection


change_priorities.start();
make_call.start();

// Body parser middleware
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));

//express middleware
app.use(express.json());

// Routes 

app.get('/',(req,res) => {
    res.send("Welcome to API, Do enjoy our services.")
})

app.post('/login',bodyparser.json(),async (req,res) => {
    const user_id = req.body.user_id;
    const phonenumber = req.body.phonenumber;

    const result = await pool.query(`SELECT * FROM users_details WHERE ID = $1 AND PHONENUMBER = $2`,[user_id,phonenumber]);

    if ( !result.rows[0] ){
        res.send({
            message : "Invalid user details"
        })
    }

    const user = { user_id : user_id } ;
    const accesstoken = auth_jwt.generateToken(user);

    res.json({accesstoken : accesstoken});

})

app.use(auth_jwt.authenticateToken);

app.route('/task')
.get(async (req, res) => {
        try {
          const { userId, priority, dueDate, page, limit } = req.query;

          let query = `
            SELECT *
            FROM task
            WHERE user_id = $1
          `;
          const queryParams = [userId];
      
          if (priority) {
            query += ` AND priority = $${queryParams.push(priority)}`;
          }
          if (dueDate) {
            query += ` AND due_date = $${queryParams.push(dueDate)}`;
          }

          const offset = (page - 1) * limit;
          query += ` LIMIT $${queryParams.push(limit)} OFFSET $${queryParams.push(offset)}`;
      
          const { rows } = await pool.query(query, queryParams);
      
          res.json(rows);
        } catch (error) {
          console.error('Error fetching tasks:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      })
.post(async (req,res) => {
    try{
        
        if(req.body.title && req.body.description && req.body.due_date ){
            res.sendStatus(403).send({
                message : "Didn't provide sufficient details"
            })
        }
        const title = req.body.title ;
        const description = req.body.description ;
        const due_date = req.body.due_date ;
        const user_id = req.body.user_id ;

        const date2 = new Date();
        const diffTime = Math.abs(due_date - date2);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        let priority;

        if(diffDays = 0){
            priority=0;
        }else if(diffDays == 1 || diffDays==2){
            priority=1;
        }else if(diffDays == 3 || diffDays==4){
            priority=2;
        }else{
            priority=3;
        }
    
        const result = await pool.query(`INSERT INTO TASK(TITLE,DESCRIPTION,DUE_DATE,STATUS,PRIORITY,USER_ID) VALUES ($1,$2,$3,'TODO',$4,$5) RETURNING *`,[title,description,due_date,priority,user_id]);

        res.send(result.rows[0]);
    }catch (err){
        console.error(err.message);
        res.sendStatus(500).send({
            error:"Internal server error"
        })
    }

})
.put(async (req,res) => {
    try{
        const update_field = req.params.field;
        const task_id = req.body.id ;
        const status = req.body.status;
        const due_date = req.body.due_date;
    
        if(!task_id && !update_field && (!status || !due_date)){
            res.send({
                message:"Insufficient details for updating"
            })
        }
    
        if(update_field == 'due_date'){
            const result = await pool.query(`UPDATE TASK SET DUE_DATE = $1 WHERE TASK_ID = $2 RETURNING *`,[due_date,task_id]);
            res.send(result.rows[0]);
        }else if(update_field == 'status'){
            const result = await pool.query(`UPDATE TASK SET STATUS = $1 WHERE TASK_ID = $2 RETURNING *`,[status,task_id]);
            res.send(result.rows[0]);
        }else{
            res.send({
                message: `You cannot update ${update_field}`
            })
        }
    }catch (err){
        console.error(err.message);
        res.sendStatus(500).send({
            error:"Internal server error"
        })
    }
})
.delete(async (req,res) => {
    try{
        const task_id = req.body.task_id;

        if(!task_id){
            res.send({
                message:"How do I know which task to delete If I don't mention which task to delete."
            })
        }

        const result = await pool.query(`DELETE FROM  TASK WHERE ID = $1 RETURNING *`,[task_id]);
        res.send(result.rows[0]);
    }catch (err){
        console.error(err.message);
        res.sendStatus(500).send({
            error:"Internal server error"
        })
    }

    
});

app.route('/subtask')
.get(async (req,res) => {
    try{
        const user_id = req.params.user_id ;
        const task_id = req.params.task_id ;

        if(!task_id){
            const result = await pool.query(`SELECT *  FROM TASK,SUB_TASK WHERE TASK.ID = SUB_TASK.TASK_ID AND USER_ID = $1`,[user_id]);
            res.send(result.rows[0]);
        }else{
            const result = await pool.query(`SELECT *  FROM TASK,SUB_TASK WHERE TASK.ID = SUB_TASK.TASK_ID AND USER_ID = $1 AND TASK_ID=$2`,[user_id,task_id]);
            res.send(result.rows[0]);
        }
    }catch (err){
        console.error(err.message);
        res.sendStatus(500).send({
            error:"Internal server error"
        })
    }
    
})
.post(async (req,res) => {
    try{
        const task_id = req.body.task_id ;
        if(!task_id){
            res.sendStatus(403).send({
                message : "Didn't provide sufficient details"
            })
        }

        const result = await pool.query(`INSERT INTO SUB_TASK(TASK_ID) VALUES ($1) RETURNING *`,[task_id]);

        res.send(result.rows[0]);
    }catch (err){
        console.error(err.message);
        res.sendStatus(500).send({
            error:"Internal server error"
        })
    }
})
.put(async (req,res) =>{
    try{
        const subtask = req.body.subtask_id;
        const status = req.body.status;

        if(!subtask && !status){
            res.send({
                message:"Insufficient details for updating"
            })
        }

        const result = await pool.query(`UPDATE SUB_TASK SET STATUS = $1 WHERE ID = $2 RETURNING *`,[status,subtask]);
        res.send(result.rows[0]);
    }catch (err){
        console.error(err.message);
        res.sendStatus(500).send({
            error:"Internal server error"
        })
    }
})
.delete(async (req,res) => {
    try{
        const subtask = req.body.subtask_id;

        if(!subtask ){
            res.send({
                message:"How do I know which subtask to delete If I don't mention which task to delete."
            })
        }

        const result = await pool.query(`DELETE FROM  SUB_TASK WHERE ID = $1 RETURNING *`,[subtask]);
        res.send(result.rows[0]);
    }catch (err){
        console.error(err.message);
        res.sendStatus(500).send({
            error:"Internal server error"
        })
    }
    
});

app.route("*",(req,res) => {
    res.sendStatus(404);
})

app.listen(3000,() =>{
    console.log("Server started at port 3000");
})
