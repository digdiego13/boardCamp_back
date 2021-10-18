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

const newCategorySchema = Joi.object().length(1).keys({
    name: Joi.string().alphanum().min(1).max(30).required()
});

const newGameSchema = Joi.object().length(5).keys({
    name: Joi.string().min(1).max(30).required(),
    image: Joi.string().min(1).required(),
    stockTotal: Joi.number().integer().greater(0).required(),
    categoryId: Joi.number().integer().positive().required(),
    pricePerDay: Joi.number().integer().greater(0).required(),
});

const stringWithOnlyNumbers = /^[0-9]+$/;

const customerSchema = Joi.object().length(4).keys({
    name: Joi.string().min(1).max(30).required(),
    phone: Joi.string().min(10).max(11).pattern(stringWithOnlyNumbers).required(),
    cpf: Joi.string().length(11).pattern(stringWithOnlyNumbers).required(),
    birthday: Joi.date().required(),
});

const rentalSchema = Joi.object().length(3).keys({
    customerId: Joi.number().integer().positive().required(),
    gameId: Joi.number().integer().positive().required(),
    daysRented: Joi.number().integer().greater(0).required(),
});

// ------- Categories

app.get('/categories', async (req, res) => {
    try{
        const promise = await connection.query('SELECT * FROM categories;');
        if (promise.rows.length === 0) {
            return res.sendStatus(404);
        }
        res.send(promise.rows);
    }
    catch{
        return res.sendStatus(500);
    }
    
})

app.post('/categories', async (req, res) => {


    try {
        const clientReq = req.body;
        const isCorrectBody = newCategorySchema.validate(clientReq);
        if (isCorrectBody.error) {
            return res.status(400).send(`Bad Request: ${isCorrectBody.error.details[0].message}`);
        }
         
        const isNewCategory = await connection.query(`
            SELECT name 
            FROM categories 
            WHERE name iLIKE '${newCategory}';
        `);

        if (isNewCategory.rows.length !== 0) {
            return res.status(409).send("This category already exists!");
        }
        const promise = await connection.query('INSERT INTO categories (name) VALUES ($1);', [clientReq.name]);
        res.sendStatus(200);
    }
    catch(error) { 
        return res.sendStatus(500);
    }
    
})

// ------- games


app.get('/games', async (req, res) => {


    try {
        const promise = await connection.query(`
        SELECT games.*, 
                categories.name AS "categoryName" 
            FROM games 
            JOIN categories 
                ON games."categoryId" = categories.id
            ${req.query.name ? 
                `WHERE games.name iLIKE '${req.query.name}%'` 
                : ""};
        `);

        if (promise.rows.length === 0) {
            return res.sendStatus(404);
          }
          res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(500);
    }
    
})

app.post('/games', async (req, res) => {


    try {
        const clientReq = req.body;
        const isCorrectBody = newGameSchema.validate(clientReq);
        if (isCorrectBody.error) {
            return res.status(400).send(`Bad Request: ${isCorrectBody.error.details[0].message}`);
        }

        const isNewGame = await connection.query(`
        SELECT name 
        FROM games 
        WHERE name iLIKE '$1';
    `, [clientReq.name]);
    if (isNewGame.rows.length !== 0) {
        return res.status(409).send("This game already exists!");
    }

    const isValidCategory = await connection.query(`
        SELECT *
        FROM categories 
        WHERE id = $1;
    `, [clientReq.categoryId]);

    if (isValidCategory.rows.length === 0) {
        return res.status(400).send("This category id does not exist!");
    }


        const promise = await connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5);', [clientReq.name, clientReq.image, clientReq.stockTotal, clientReq.categoryId, clientReq.pricePerDay]);
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(500);
    }
    
})

// ------- customers


app.get('/customers', async (req, res) => {


    try{
        const promise = await connection.query('SELECT * FROM customers;');
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(404);
    }
    
})

app.get('/customers/:id', async (req, res) => {


    try{
        const id = Number(req.params.id);
        console.log
        const promise = await connection.query('SELECT * FROM customers WHERE id = $1;', [id]);
        res.send(promise.rows);
    }
    catch(error) {
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
        return res.sendStatus(404);
    }
    
});


// ------- rentals


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
        return res.sendStatus(404);
    }
    
})

app.post('/rentals', async (req, res) => {


    try {
        const clientReq = req.body;
        const today = dayjs().format('YYYY-MM-DD');
        const pricePerDay = await connection.query('SELECT "pricePerDay" FROM games WHERE id = $1', [Number(clientReq.gameId)]);
        const originalPrice = Number(Number(clientReq.daysRented) * Number(pricePerDay.rows[0].pricePerDay));
        const promise = await connection.query('INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7);', [clientReq.customerId, clientReq.gameId, today, clientReq.daysRented, null, originalPrice, null]);
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(404);
    }
    
});

app.post('/rentals/:id/return', async (req, res) => {


    try {
        const id = Number(req.params.id);
        const today = dayjs()
        const rentalInfo = await connection.query(`SELECT "rentDate", "daysRented", "originalPrice" FROM rentals WHERE id = $1;`, [id]);
        const {rentDate, daysRented, originalPrice} = rentalInfo.rows[0];
        const rentDateFront = dayjs(rentDate)
        const delayDays = (today.diff(rentDateFront, 'day') - daysRented);
        const pricePerDay = originalPrice / daysRented;
        let delayFee = Number(delayDays * pricePerDay);
        
        if(delayDays < 1 ) {
            delayFee = 0;
         }
         const promise = await connection.query(`UPDATE rentals SET 
         "returnDate" = $1,
         "delayFee" = $2
         WHERE id = $3;`, [today.format('YYYY-MM-DD'), delayFee, id]);
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(404);
    }
    
});

app.delete('/rentals/:id', async (req, res) => {

    try{
        const id = Number(req.params.id);
        const promise = await connection.query(`DELETE FROM rentals WHERE id = $1;`, [id]);
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(404);
    }
})

app.listen(4000);
