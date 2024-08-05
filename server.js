const http = require('http');
const path = require('path');
const fs = require('fs');
const qs = require('querystring');
const { MongoClient } = require('mongodb');

const PORT = 3000;
const MONGO_URI = 'mongodb://localhost:27017'; // Replace with your MongoDB connection string
const DB_NAME = 'employeeDB';
const COLLECTION_NAME = 'employees';

// Create a new MongoClient instance without deprecated options
const client = new MongoClient(MONGO_URI);

async function main() {
    try {
        // Connect to the MongoDB server
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        const server = http.createServer(async (req, res) => {
            if (req.method === 'GET' && req.url === '/') {
                fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(data);
                    }
                });
            } else if (req.method === 'POST' && req.url === '/submit') {
                let body = '';

                req.on('data', chunk => {
                    body += chunk.toString();
                });

                req.on('end', async () => {
                    const parsedData = qs.parse(body);
                    const { empId, empName, department, salary } = parsedData;

                    if (!empId || !empName || !department || !salary) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Bad Request: Missing fields');
                        return;
                    }

                    const employee = {
                        empId,
                        empName,
                        department,
                        salary
                    };

                    try {
                        await collection.insertOne(employee);
                        res.writeHead(302, { 'Location': '/employees' });
                        res.end();
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    }
                });
            } else if (req.method === 'POST' && req.url.startsWith('/delete')) {
                let body = '';

                req.on('data', chunk => {
                    body += chunk.toString();
                });

                req.on('end', async () => {
                    const parsedData = qs.parse(body);
                    const { empId } = parsedData;

                    if (!empId) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Bad Request: Missing employee ID');
                        return;
                    }

                    try {
                        await collection.deleteOne({ empId });
                        res.writeHead(302, { 'Location': '/employees' });
                        res.end();
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    }
                });
            } else if (req.method === 'GET' && req.url === '/employees') {
                try {
                    const employees = await collection.find({}).toArray();
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.write(`
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Employee List</title>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    background-color: #f4f4f4;
                                    margin: 0;
                                    padding: 20px;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                }
                                h1 {
                                    color: #333;
                                }
                                table {
                                    width: 80%;
                                    border-collapse: collapse;
                                    margin-top: 20px;
                                }
                                th, td {
                                    padding: 12px;
                                    border: 1px solid #ddd;
                                    text-align: left;
                                }
                                th {
                                    background-color: #007bff;
                                    color: white;
                                }
                                tr:nth-child(even) {
                                    background-color: #f2f2f2;
                                }
                                a {
                                    display: inline-block;
                                    margin-top: 20px;
                                    text-decoration: none;
                                    color: #007bff;
                                }
                                a:hover {
                                    text-decoration: underline;
                                }
                                form {
                                    display: inline;
                                }
                                button {
                                    background-color: #ff4d4d;
                                    color: white;
                                    border: none;
                                    padding: 5px 10px;
                                    border-radius: 3px;
                                    cursor: pointer;
                                }
                                button:hover {
                                    background-color: #e60000;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>Employee List</h1>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Employee ID</th>
                                        <th>Employee Name</th>
                                        <th>Department</th>
                                        <th>Salary</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `);
                    employees.forEach(employee => {
                        res.write(`
                            <tr>
                                <td>${employee.empId}</td>
                                <td>${employee.empName}</td>
                                <td>${employee.department}</td>
                                <td>${employee.salary}</td>
                                <td>
                                    <form action="/delete" method="POST">
                                        <input type="hidden" name="empId" value="${employee.empId}">
                                        <button type="submit">Delete</button>
                                    </form>
                                </td>
                            </tr>
                        `);
                    });
                    res.write(`
                                </tbody>
                            </table>
                            <a href="/">Back to form</a>
                        </body>
                        </html>
                    `);
                    res.end();
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });

        server.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
    }
}

main();
