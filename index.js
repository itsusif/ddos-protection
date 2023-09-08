const express = require('express');
const app = express();
const requestIp = require('request-ip');
const { DataBaseJSON } = require('good.db');

const db = new DataBaseJSON('blacklist.json', true, '..');

const seconds = 1000 * 3;
let blockTime = 1000 * 60 * 60 * 24;
const infractionsMax = 10;

app.use(requestIp.mw());

app.use(function (req, res, next) {
    let clientIp=  req.clientIp;
    let bloclTimePast = (new Date().getTime() - db.get(`block..${clientIp}..blockTime`) < blockTime) ? false : true;
    console.log(bloclTimePast);
    if (db.get(`block..${req.clientIp}..isBlocked`) === true && bloclTimePast === false) {
        return;
    }

    var timePast = false;
    if (!db.get(`requestData..${clientIp}`)) {
        db.set(`requestData..${clientIp}`, {
            time: new Date().getTime(),
            infractions: 0
        })
        timePast = true;
    } else {
        timePast = (new Date().getTime() - db.get(`requestData..${clientIp}..time`) < seconds) ? false : true;
    }

    switch (timePast) {
        case true:
            db.set(`requestData..${clientIp}..time`, new Date().getTime());
            if (db.get(`requestData..${clientIp}..infractions`) > 0) {
                var g = parseInt(db.get(`requestData..${clientIp}..infractions`));
                g = g - 1;
                db.set(`requestData..${clientIp}..infractions`, g);
            }
            console.log(`[${req.method}] ${req.clientIp} ${db.get(`requestData..${clientIp}..infractions`)}`);
            next();
            break;
        case false:
            var g = parseInt(db.get(`requestData..${clientIp}..infractions`));
            g = g + 1;
            db.set(`requestData..${clientIp}..infractions`, g)
            if (db.get(`requestData..${clientIp}..infractions`) > infractionsMax) {

                db.set(`block..${req.clientIp}..isBlocked`, true)
                db.set(`block..${req.clientIp}..blockTime`, new Date().getTime())

                console.log(`[${req.method}] ${req.clientIp} is now blacklisted. Exceeded infractions`);
                db.delete(`requestData..${clientIp}`)
                return;
            }
            console.log(`[${req.method}] blocked from ${req.clientIp} ${db.get(`requestData..${clientIp}..infractions`)}`);
            next();
            break;
    }
});

app.get('/', function (req, res) {
    res.send('Hello');
});

app.listen(1234, () => {
    console.log('Server is running on port 1234');
});
