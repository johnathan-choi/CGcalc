# CGcalc

### Calculates Capital Gains/Losses in Canadian dollars ###

[Access the Heroku-hosted site here](https://cgcalc.herokuapp.com/index.html)

This program is *supposed to* take any exchange's exported trades spreadsheet and calculate the capital gain or loss for each trade.

Right now it only works on Binance sheets.

#### Limitations ####
* Cannot do X/BNB trades. Program ***will*** break.
    * Remove those lines from your spreadsheet before submitting.
    * I should fix this later.
* Heroku has a hard-coded timeout of 30 seconds.
    * This means that the site can run ~25 lines before crashing.
    * I might fix this later.
    * Clone + run it on your own box (timeout set at 20 minutes: ~1.5k+ lines) on Node.

    `node server.js` Or
    `nodemon -i './public/*'` If you have nodemon installed.
    
    Go to localhost:8080.


#### Usage ####
0. Get a copy of your Binance trades history
    * Remove X/BNB rows
1. Access my site above or run it on your box locally.
2. Attach the spreadsheet use one of the two buttons on the site.
3. Submit the spreadsheet using the other button.
4. When the result says Download, do that.
    * If the result says Currently processing sheet. for more than 30 seconds, something probably went wrong.

#### Support ####
* This program is provided as-is blah blah blah

Johnathan Choi 2018