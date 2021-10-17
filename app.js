import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dayjs from 'dayjs';

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());


const connection = new Pool(
    {
        user: 'postgres',
        password: '123456',
        host: 'localhost',
        port: 5432,
        database: 'boardcamp'
      }
)

app.get('/categories', async (req, res) => {
    try{
        const promise = await connection.query('SELECT * FROM categories;');
        console.log(promise.rows);
        res.send(promise.rows);
    }
    catch{
        console.log('nao foi possivel conectar');
        return res.sendStatus(404);
    }
    
})

app.post('/categories', async (req, res) => {


    try {
        const clientReq = req.body;
        console.log(clientReq.name);
        const promise = await connection.query('INSERT INTO categories (name) VALUES ($1);', [clientReq.name]);
        console.log(promise.rows);
        res.sendStatus(200);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
})

app.get('/games', async (req, res) => {


    try {
        const promise = await connection.query(`
        SELECT 
            games.*, 
            categories.name AS "categoryName" 
        FROM games 
        JOIN categories 
        ON games."categoryId"=categories.id;`);

        res.send(promise.rows);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
})

app.post('/games', async (req, res) => {


    try {
        const clientReq = req.body;
        const promise = await connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);', [clientReq.name, clientReq.image, clientReq.stockTotal, clientReq.categoryId, clientReq.pricePerDay]);
        res.send(promise.rows);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
})


app.get('/customers', async (req, res) => {


    try{
        const promise = await connection.query('SELECT * FROM customers;');
        console.log(promise.rows);
        res.send(promise.rows);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
})

app.get('/customers/:id', async (req, res) => {


    try{
        const id = Number(req.params.id);
        console.log
        const promise = await connection.query('SELECT * FROM customers WHERE id = $1;', [id]);
        console.log(promise.rows);
        res.send(promise.rows);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
})

app.post('/customers', async (req, res) => {


    try {
        const clientReq = req.body;
        const promise = await connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4);', [clientReq.name, clientReq.phone, clientReq.cpf, clientReq.birthday]);
        res.send(promise.rows);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
});


app.put('/customers/:id', async (req, res) => {


    try {
        const id = Number(req.params.id);
        const clientReq = req.body;
        const promise = await connection.query(`UPDATE customers SET 
        name = $1,
        phone = $2,
        cpf = $3,
        birthday = $4
        WHERE id = $5`, [clientReq.name, clientReq.phone, clientReq.cpf, clientReq.birthday, id]);
        res.send(promise.rows);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
});




app.get('/rentals', async (req, res) => {


    try{
        const promise = await connection.query(`
        SELECT rentals.*, 
            customers.id AS "customerIdo", 
            customers.name AS "customerName",
            games.id AS "gameId",
            games.name AS "gameName",
            games."categoryId",
            categories.name AS "categoryName"  
        FROM rentals 
        JOIN customers 
        ON rentals."customerId" = customers.id
        JOIN games
        ON rentals."gameId" = games.id
        JOIN categories
        ON games."categoryId" = categories.id`);

        
        const arrayRentals = promise.rows.map(rental => {

            const newRentalObject = {
                id: rental.id,
                customerId: rental.customerId,
                gameId: rental.gameId,
                rentDate: rental.rentDate,
                daysRented: rental.daysRented,
                returnDate: rental.returnDate,
                originalPrice: rental.originalPrice,
                delayFee: rental.delayFee,
                customer: {
                 id: rental.customerIdo,
                 name: rental.customerName
                },
                game: {
                  id: rental.gameId,
                  name: rental.gameName,
                  categoryId: rental.categoryId,
                  categoryName: rental.categoryName
                }
              }
            return newRentalObject;
        })
        
        res.send(arrayRentals);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
})

app.post('/rentals', async (req, res) => {


    try {
        const clientReq = req.body;
        const today = dayjs().format('YYYY/MM/DD');
        const pricePerDay = await connection.query('SELECT "pricePerDay" FROM games WHERE id = $1', [Number(clientReq.gameId)]);
        const originalPrice = Number(Number(clientReq.daysRented) * Number(pricePerDay.rows[0].pricePerDay));
        console.log(originalPrice);
        const promise = await connection.query('INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7);', [clientReq.customerId, clientReq.gameId, today, clientReq.daysRented, null, originalPrice, null]);
        console.log(promise.rows);
        res.send(promise.rows);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
});

app.post('/rentals/:id/return', async (req, res) => {


    try {
        const id = Number(req.params.id);
        const clientReq = req.body;
        const today = dayjs().format('YYYY/MM/DD');
        const promise = await connection.query('INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7);', [clientReq.customerId, clientReq.gameId, today, clientReq.daysRented, null, originalPrice, null]);
        console.log(promise.rows);
        res.send(promise.rows);
    }
    catch(error) {
        console.log(error);
        return res.sendStatus(404);
    }
    
});


app.listen(4000);
