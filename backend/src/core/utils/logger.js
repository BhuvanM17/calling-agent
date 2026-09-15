const winston = require("winston");

const customLevels = {
  levels: {
    emerg: 0,
    alert: 1,
    crit: 2,
    error: 3,
    warning: 4,
    warn: 4,
    notice: 5,
    info: 6,
    debug: 7,
  },
  colors: {
    emerg: "red",
    alert: "red",
    crit: "red",
    error: "red",
    warning: "yellow",
    warn: "yellow",
    notice: "blue",
    info: "green",
    debug: "white",
  },
};

winston.addColors(customLevels.colors);

const level = process.env.NODE_ENV === "development" ? "debug" : "info";

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
      ),
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
  silent: process.env.NODE_ENV === "test",
});

module.exports = logger;
