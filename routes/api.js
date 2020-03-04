/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

"use strict";

var mongoose = require("mongoose");
const fetch = require("node-fetch");

var stockProxy = `https://repeated-alpaca.glitch.me/v1/stock/symbol/quote`;
var StockSchema = mongoose.Schema({
  name: String,
  likes: { type: [String], default: [] }
})

var Stock = mongoose.model("stocks", StockSchema);

function getProxyURI(URI, symbol) {
  return URI.replace("symbol", symbol);
}

function StockData(name, price, likes, rel) {
  this.stock = name;
  this.price = price.toString();
  if (!rel)
    this.likes = likes;
  else
    this.rel_likes = likes;
}

function saveStock(name, ip, like) {
  let newStock = new Stock({
    name: name,
    likes: like ? [ip] : []
  })

  return Stock.findOne({ name }).then(stock => {
    if (!stock) {
      return newStock.save();
    }
    if (like && !stock.likes.includes(ip)) {
      stock.likes.push(ip);
    }
    return stock.save();
  })
}

function parseData(data) {
  let i = 0;
  data.forEach(element => {
    if (element instanceof mongoose.Document)
      i++;
  })
  if (i > 1) {
    return [
      new StockData(data[0].name, data[1].latestPrice, data[0].likes.length - data[2].likes.length,true),
      new StockData(data[2].name, data[3].latestPrice, data[2].likes.length - data[0].likes.length,true)
    ]
  }
  return new StockData(data[0].name, data[1].latestPrice, data[0].likes.length);
}

module.exports = function (app) {
  app.route("/api/stock-prices").get(function (req, res) {
    let symbols = req.query.stock;
    if (!Array.isArray(symbols)) symbols = [symbols];  //convert to array
    let ip = req.ip;
    let promises = [];

    symbols.forEach(symbol => {
      promises.push(saveStock(symbol.toUpperCase(), ip, req.query.like))
      promises.push(fetch(getProxyURI(stockProxy, symbol.toUpperCase())).then(res => res.json()))
    });

    Promise.all(promises).then(data => {
      let stockData = { stockData: parseData(data) };
      res.json(stockData);
    })
    .catch(err => {
      res.send(err);
    })
  });
};
