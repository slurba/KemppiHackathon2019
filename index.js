//@Author Slurba
//Read sensors connected to GrovePi and send their values to Kemppi backend
const http = require("http");
//Core toiminnallisuus luottaa tähän kirjastoon
//https://github.com/DexterInd/GrovePi/tree/master/Software/NodeJS
const GrovePi = require('node-grovepi').GrovePi;
const Commands = GrovePi.commands;
const Board = GrovePi.board;
//Sensorit
//"Due to the measuring mechanism, this sensor can't output specific data to describe target gases' concentrations quantitatively" Yay xd
var AirQualityAnalogSensor = GrovePi.sensors.AirQualityAnalog; 
var DHTDigitalSensor = GrovePi.sensors.DHTDigital;
//Kirjastossa ei ole soundSensoria mutta loudness on close enough
var LoudnessAnalogSensor = GrovePi.sensors.LoudnessAnalog;
//Indikaattorit
var redLed = new GrovePi.sensors.DigitalOutput(8); //DHT (Temp)
var greenLed = new GrovePi.sensors.DigitalOutput(3); //AIR Q
var blueLed = new GrovePi.sensors.DigitalOutput(4); //SOUND
//Väli (ms)
var uploadInterval = 60000;

//Pilveen postattavat arvot
var airQ = null; //airQ > 100 = really bad, 100 > airQ > 50 = bad, airQ < 50 = good 
var loudnessLvl = null; //"loudness average and max for values"
var tempC = null; //Celcius
//Event array
var evMessages = [];
//Dangerous events
function sendEvent(evMessagesArray)
{
    let eventData = [];
    evMessagesArray.forEach(element => {
        eventData.push(constructEvent(element));
    }); 
    console.log(eventData.toString());
    let evDataInJson = JSON.stringify(eventData);
    evPostReq = 
    {
        host: "health-safety.dev.api.kemppi.com",
        protocol: "http:",
        port: 8080,
        method: "POST",
        path: "/api/sensordata",
        headers: {
            "Authorization" : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZWFtXzUifQ.tvjterUP5Z5Zb2SVcdPUsKkGtC1DPBlKDxmLB0y1iMI",
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(evDataInJson)
        }
    };
    let evPost = http.request(evPostReq, (res)=>
    {
        res.on('data', function (chunk) {
            console.log('EVT-RESPONSE: ' + chunk);
        });
    });
    evPost.write(evDataInJson);
    evPost.end();
}
//Take in a messageBody, return full message
function constructEvent(evMessage)
{
    let evTimeStamp = new Date().toLocaleString();
    let retThis = {
    "timestamp" : evTimeStamp,
    "type" : "EVENT",
    "value" : evMessage
    };
    return retThis;
}
//Prev vals
var prevAirQ = null;
var prevLoudnessLvl = null;
var prevTempC = null;
//Indikaattori On/Off status
var redLedOn = false;
var greenLedOn = false;
var blueLedOn = false;

//Not used atm
function flipRed()
{
    if(redLedOn)
    {
        redLed.turnOff();
    }
    else
    {
        redLed.turnOn();
    }
}
function flipGreen()
{
    if(greenLedOn)
    {
        greenLed.turnOn();
    }
    else
    {
        greenLed.turnOff();
    }
}
//Check vals & call send
function checkAndSend()
{
    console.log("SENDING DATA...");
    if(airQ != null && loudnessLvl != null && tempC != null)
    {
        prevAirQ = airQ;
        prevLoudnessLvl = loudnessLvl;
        prevTempC = tempC;
        sendData(airQ,loudnessLvl,tempC);
    }
    else
    {
        console.log("VALUES ARE NULL, DOES NOT SEND");
    }
    if(evMessages.length > 0)
    {
        console.log(evMessages.length)
        sendEvent(evMessages);
        evMessages = [];
        evMessages.length;
    }
    
}
//Do the sending
function sendData(airVal, loudnessVal, tempVal)
{   
    let newData;
    let timeStamp = new Date().toLocaleString();
    //Yritys vähentää turhien kyselyiden määrää
    if(typeof airVal != "undefined" && typeof loudnessVal != "undefined" && typeof tempVal != "undefined")
    {
        newData = 
        [
            {
            "timestamp" : timeStamp,
            "type" : "AIR",
            "value" : airVal
            },
            {
            "timestamp" : timeStamp,
            "type" : "SOUND",
            "value" : loudnessVal
            },
            {
            "timestamp" : timeStamp,
            "type" : "TEMP",
            "value" : tempVal
            }
        ];
    }
    else if(typeof airVal != "undefined" && typeof loudnessVal != "undefined")
    {
        newData = 
        [
            {
            "timestamp" : timeStamp,
            "type" : "AIR",
            "value" : airVal
            },
            {
            "timestamp" : timeStamp,
            "type" : "SOUND",
            "value" : loudnessVal
            }
        ];
    }
    else if(typeof airVal != "undefined")
    {
        newData = 
        [
            {
            "timestamp" : timeStamp,
            "type" : "AIR",
            "value" : airVal
            }
        ];
    }
    //Tämä kuin eka koska if decision tree on huono idea
    else 
    {
        newData = 
        [
            {
            "timestamp" : timeStamp,
            "type" : "AIR",
            "value" : airVal
            },
            {
            "timestamp" : timeStamp,
            "type" : "SOUND",
            "value" : loudnessVal
            },
            {
            "timestamp" : timeStamp,
            "type" : "TEMP",
            "value" : tempVal
            }
        ];
    }
    let dataInJson = JSON.stringify(newData);
    postReq = 
    {
        host: "health-safety.dev.api.kemppi.com",
        protocol: "http:",
        port: 8080,
        method: "POST",
        path: "/api/sensordata",
        headers: {
            "Authorization" : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZWFtXzUifQ.tvjterUP5Z5Zb2SVcdPUsKkGtC1DPBlKDxmLB0y1iMI",
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataInJson)
        }
    };
    let post = http.request(postReq, (res)=>
    {
        res.on('data', function (chunk) {
            console.log('DATA-RESPONSE: ' + chunk);
        });
    });
    post.write(dataInJson);
    post.end();
}
/*
Paths:
    /health
    /api/sensordata?type=X&start=Y&end=Z&limit=MIN&from=MAX
    /api/sensordata

Notes:
    type : vapaavalintainen koske ME työnnämme kaiken datan sinne
    start/end : timestamps
    limit/from : seems like int/float/double
*/

//Init board
var board = new Board({
    debug: true,
    onError: function(err) {
      console.log('ERROR!: '+err);
    },
    onInit: function(res) {
        if (res) {
            console.log("GrovePi Version: " + board.version());
            //Ääni, hups ei loudness vaan sound
            //http://purposefulscience.blogspot.com/2013/04/noise-meter-with-electret-microphone.html
            //https://forum.dexterindustries.com/t/sound-sensor-readings/763/3
            //"The Sensor Value represents the ADC value of the voltage which varies between 0 to 1023"
            //Refrence taulukko: http://1.bp.blogspot.com/-BC96qOSpze4/UWr8aQI4Z4I/AAAAAAAAAOw/UwI1xEhlg_8/s1600/tabla_electret.PNG
            //Ehdotus dBSPL arvojen loggaamisesta tyrmätty, ääni varmaan deprecated ominaisuus
            var soundLevel = new LoudnessAnalogSensor(2, 10);
            console.log('Sound Sensor (start watch)');
            soundLevel.on('change', function(res) {
                console.log("Sensor ADC: "+res);
                loudnessLvl = res;
                //Ylhäällä linkatusta kuvaajasta voidaan päätellä että kipukynnys (80db)
                //Tapahtuu ADC arvojen 512 ja 600 välillä, joten laitetaan "vaaran" raja arvojen väliin
                if(loudnessLvl > 550)
                {
                    blueLed.turnOn();
                    blueLedOn = true;
                    //evMessages.push("DANGEROUS NOISE LEVEL WARNING!");
                    evMessages.push(9);
                }
                else
                {
                    blueLed.turnOff();
                    blueLedOn = false;
                }
            });
            soundLevel.watch();
            //Ilmanlaatu
            //Tulokset outoja koska groven sensori "ei pysty" erottelemaan dataa (lmao??)
            //Tällä ei varoitusta koska arvotkin ovat useless
            var airQuality = new AirQualityAnalogSensor(1);
            console.log('AirQuality Sensor (start watch)');
            airQuality.on('change', function(res) {
                console.log("Air Q: "+res);
                airQ = res;
                if(airQ > 50) //> 50 = bad
                {
                    greenLed.turnOn();
                    greenLedOn = true;
                    //evMessages.push("AIR QUALITY WARNING!");
                    evMessages.push(10);
                }
                else if(greenLedOn)
                {
                    greenLed.turnOff();
                    greenLedOn = false;
                }
            });
            airQuality.watch();
            //Palautetut arvot [temp, hum, heatIndex]
            //"...this sensor will not work for temperatures below 0 degree"
            //Vain temp lähetetään
            //Punaninen varoitusvalo syttyy jos temp > 60
            var dhtSensor = new DHTDigitalSensor(2,DHTDigitalSensor.VERSION.DHT11,DHTDigitalSensor.CELSIUS)
            console.log('DHT Sensor (start watch)');
            dhtSensor.on('change', function(res) {
                if(res[0] > 0 && res[0] < 80)
                {
                    console.log("Temp: "+res[0]+"C");
                    //Not used, logged for fun
                    console.log("Hum: "+res[1]+"RH");
                    tempC = res[0];
                    if(res[0] > 60)
                    {
                        redLed.turnOn();
                        redLedOn = true;
                        //evMessages.push("HIGH TEMPERSTURE WARNING!");
                        evMessages.push(11);
                    }
                    else
                    {
                        redLed.turnOff();
                        redLedOn = false;
                    }
                }
            });
            dhtSensor.watch();
        }
    }
});
board.init();

//Uncomment to activate data uploading
setInterval(checkAndSend, uploadInterval);
