const NUM_OF_LB = 10;
const express = require('express');
const app = express();
const PORT = 3000;
var time = 0;
var last_connect_time = new Array(NUM_OF_LB).fill(0);
app.use(express.json()); // 啟用JSON解析
app.use(express.static('public'));

app.post('/settime', (req, res) => {
    time = req.body.time;
    console.log(`Received time: ${time} ms`);
    res.status(200).send('Time updated');
});

app.get('/gettime', (req, res) => {
    const ID = parseInt(req.query.id);  // 從查詢參數中取得ID
    var now = new Date();
    last_connect_time[ID] = now.getTime();
    res.send(time.toString());
});

app.get('/getlastconnecttimes', (req, res) => {
    var now = new Date().getTime();
    var timesSinceLastConnect = last_connect_time.map(t => now - t);
    res.json(timesSinceLastConnect);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
