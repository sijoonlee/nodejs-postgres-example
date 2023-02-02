const express = require("express");
const app = express();
const queryString = require('query-string');
const { Client } = require('pg');
const e = require("express");

(async () => {
    let client
    try {
        client = new Client({
            user: 'postgres',
            database: 'postgres',
            port: 5432,
            host: 'localhost',
            password: 'mypasswd',
            ssl: false
        })
        await client.connect()
    } catch (err) {
        console.log(err)
        return
    }
    
    const PORT = process.env.PORT || 5111;

    await client.query("create table if not exists \"epic-task-scon\" "
        + "( Id serial primary key,"
        + " CreatedDate date,"
        + " stringvalue varchar(5),"
        + " decimalpoints numeric(13,1) )"
    )

    const existingColumnNames = []
    const existingColumns = await client.query({
            text: "SELECT column_name, data_type FROM information_schema.columns "
                    + "WHERE table_schema = $1 "
                    + "AND table_name = $2",
            values: [ "public", "epic-task-scon" ],
        });
    existingColumnNames.push(...existingColumns.rows.map(r => r.column_name))

    console.log(existingColumnNames)
    app.use(express.json())
    
    app.post('/', async (req, res) => {
    
        const newData = req.body

        // const c = await client.query({
        //     text: "SELECT table_name FROM information_schema.tables "
        //             + "WHERE table_schema = $1 "
        //             + "AND table_type = $2",
        //     values: ["public", "BASE TABLE"]
        // });
        // console.log(c.rows.map(r => r.table_name))

        const columnNames = newData && Object.keys(newData)
        if (Array.isArray(columnNames) && columnNames.length > 0) {
            for(const col of columnNames) {
                const columnNameLowerCase = col.toLowerCase();
                // append new column
                if (!existingColumnNames.includes(columnNameLowerCase)) {
                    // please upate
                    await client.query({
                        text: "SELECT column_name, data_type FROM information_schema.columns "
                                + "WHERE table_schema = $1 "
                                + "AND table_name = $2",
                        values: [ "public", "epic-task-scon" ],
                    });
                    console.log("adding")
                    await client.query({
                        text: `ALTER TABLE \"epic-task-scon\" ADD COLUMN ${columnNameLowerCase} VARCHAR;`,
                    });
                    existingColumnNames.push(columnNameLowerCase)
                }
            }
        }

        // insert new data
        const columnListString = Object.keys(newData).map(col => `\"${col.toLowerCase()}\"`).join(", ")
        const valuesPlaceHolder = []
        for (let i = 1; i <= Object.keys(newData).length; i++) {
            valuesPlaceHolder.push(`$${i}`)
        }
        const valuesPlaceHolderString = valuesPlaceHolder.join(", ")
        const values = Object.values(newData)
        try {
            await client.query({
                text: `INSERT INTO \"epic-task-scon\" (${columnListString}) VALUES (${valuesPlaceHolderString})`,
                values
            });
        } catch (error) {

        }
        

        res.send(`Result`);
    
    });
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
    });
    
})();
