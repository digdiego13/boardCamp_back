import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dayjs from 'dayjs';
import Joi from 'joi';

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

const newCategorySchema = Joi.object().keys({
    name: Joi.string().alphanum().min(1).max(30).required()
});

const newGameSchema = Joi.object().keys({
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
        const promise = await connection.query(`
        SELECT * FROM customers
            ${req.query.cpf ? 
                `WHERE customers.cpf LIKE '${req.query.cpf}%'` 
                : ""};
        `);

        if (promise.rows.length === 0) {
            return res.sendStatus(404);
        }
        promise.rows.forEach(customer =>
            customer.birthday = dayjs(customer.birthday).format('YYYY-MM-DD')
        )
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(500);
    }
    
})

app.get('/customers/:id', async (req, res) => {


    try{
        const id = Number(req.params.id);
        const promise = await connection.query('SELECT * FROM customers WHERE id = $1;', [id]);
        if (promise.rows.length === 0) {
            return res.status(404).send("This customer id does not exist!");
        }
  
        promise.rows[0].birthday = dayjs(promise.rows[0].birthday).format('YYYY-MM-DD');
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(500);
    }
    
})

app.post('/customers', async (req, res) => {


    try {
        const clientReq = req.body;
        const isCorrectBody = customerSchema.validate(clientReq);
        if (isCorrectBody.error) {
            return res.status(400).send(`Bad Request: ${isCorrectBody.error.details[0].message}`);
        }
        const isNewCustomer = await connection.query(`
            SELECT cpf 
            FROM customers 
            WHERE cpf = $1;
        `, [clientReq.cpf]);

        if (isNewCustomer.rows.length !== 0) {
            return res.status(409).send("This cpf is already registered!");
        }

        const promise = await connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4);', [clientReq.name, clientReq.phone, clientReq.cpf, clientReq.birthday]);
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(500);
    }
    
});


app.put('/customers/:id', async (req, res) => {


    try {
        const id = Number(req.params.id);
        const clientReq = req.body;
        const isCorrectBody = customerSchema.validate(clientReq);
        if (isCorrectBody.error) {
            return res.status(400).send(`Bad Request: ${isCorrectBody.error.details[0].message}`);
        }

        const customer = await connection.query(`
            SELECT * FROM customers
            WHERE id = $1;
        `, [id]);
        if (customer.rows.length === 0) {
            return res.status(404).send("This customer id does not exist!");
        }

        const promise = await connection.query(`UPDATE customers SET 
        name = $1,
        phone = $2,
        cpf = $3,
        birthday = $4
        WHERE id = $5`, [clientReq.name, clientReq.phone, clientReq.cpf, clientReq.birthday, id]);
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(500);
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
        ON games."categoryId" = categories.id
        ${req.query.customerId ? 
            `WHERE rentals."customerId" = '${req.query.customerId}'` 
            : ""}
        ${req.query.gameId ? 
            `WHERE rentals."gameId" = '${req.query.gameId}'` 
            : ""};`
        );

        
        const arrayRentals = promise.rows.map(rental => {

            const newRentalObject = {
                id: rental.id,
                customerId: rental.customerId,
                gameId: rental.gameId,
                rentDate: dayjs(rental.rentDate).format('YYYY-MM-DD'),
                daysRented: rental.daysRented,
                returnDate: (rental.returnDate ? (dayjs(rental.returnDate).format('YYYY-MM-DD')) : (null)),
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

        if (rentals.rows.length === 0) {
            return res.sendStatus(404);
          }
        
        res.send(arrayRentals);
    }
    catch(error) {
        return res.sendStatus(500);
    }
    
})

app.post('/rentals', async (req, res) => {


    try {
        const clientReq = req.body;
        const today = dayjs().format('YYYY-MM-DD');

        const isCorrectBody = rentalSchema.validate(clientReq);
        if (isCorrectBody.error) {
            return res.status(400).send(`Bad Request: ${isCorrectBody.error.details[0].message}`);
        }

        const isValidCustomerId = await connection.query(`
            SELECT id
            FROM customers
            WHERE customers.id = $1;
        `, [clientReq.customerId]);

        if (isValidCustomerId.rows.length === 0) {
            return res.status(400).send("Invalid customer id");
        }

        const isValidGameId = await connection.query(`
            SELECT id
            FROM games
            WHERE games.id = $1;
        `, [clientReq.gameId])

        if (isValidGameId.rows.length === 0) {
            return res.status(400).send("Invalid game id");
        }


        const thisGame = await connection.query('SELECT "pricePerDay", "stockTotal" FROM games WHERE id = $1', [Number(clientReq.gameId)]);
        const originalPrice = Number(Number(clientReq.daysRented) * Number(thisGame.rows[0].pricePerDay));
        const numberOfGames = chosenGame.rows[0].stockTotal;

        const listOfRentals = await connection.query(`
            SELECT id
            FROM rentals
            WHERE rentals."gameId" = $1;
        `, [clientReq.gameId])

        const numberOfRentals = listOfRentals.rows.length;

        if (numberOfRentals > numberOfGames) {
            return res.status(400).send("This game is out of stock at the moment");
        }
        const promise = await connection.query('INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") VALUES ($1, $2, $3, $4, $5, $6, $7);', [clientReq.customerId, clientReq.gameId, today, clientReq.daysRented, null, originalPrice, null]);
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(500);
    }
    
});

app.post('/rentals/:id/return', async (req, res) => {


    try {
        const id = Number(req.params.id);
        const today = dayjs()
        const isValidRentalId = await connection.query(`
            SELECT id
            FROM rentals
            WHERE rentals.id = $1;
        `, [id])
        if (isValidRentalId.rows.length === 0) {
            return res.status(404).send("Invalid rental id");
        }

        const isRentalAlreadyFinished = await connection.query(`
            SELECT "returnDate"
            FROM rentals
            WHERE rentals.id = $1;
        `, [id])
        if (isRentalAlreadyFinished.rows[0].returnDate) {
            return res.status(400).send("This rental has already been finished");
        }

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
        return res.sendStatus(500);
    }
    
});

app.delete('/rentals/:id', async (req, res) => {

    try{
        const id = Number(req.params.id);
        const isValidRentalId = await connection.query(`
            SELECT id
            FROM rentals
            WHERE rentals.id = $;
        `, [id])
        if (isValidRentalId.rows.length === 0) {
            return res.status(404).send("Invalid rental id");
        }

        const isRentalAlreadyFinished = await connection.query(`
            SELECT "returnDate"
            FROM rentals
            WHERE rentals.id = $1;
        `, [id])
        if (isRentalAlreadyFinished.rows[0].returnDate) {
            return res.status(400).send("This rental has already been finished");
        }
        const promise = await connection.query(`DELETE FROM rentals WHERE id = $1;`, [id]);
        res.send(promise.rows);
    }
    catch(error) {
        return res.sendStatus(500);
    }
})

app.listen(4000);
