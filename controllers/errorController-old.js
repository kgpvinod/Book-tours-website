const AppError = require('./../utils/appError');

const handleDuplicateFieldDB = err => {
  const errors = Object.values(err.errors).map(el=> el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/); //finding the value which comes between the quotes ("") in errmsg generated by Mongoose when this type of error occurs.
  console.log(value);

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
}

const handleJWTWrongTokenError = () => new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please login again.', 401);

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const message = `Invalid input data.`;
  return new AppError(message, 400);
}

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  })
};

const sendErrorProd = (err,res) => {
  //Operational, trusted error: send message to client
  if(err.isOperational) {
    res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });

  //Programming or other unknown error: don't leak error details
  } else {
    //1) log error
    console.error('ERROR👹', err);

    //2) Send general message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    })
  }
  
}


module.exports = (err, req, res, next) => {
  // console.log(err.stack);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if(process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res)
  }

  else if (process.env.NODE_ENV === 'production') {
    let error = {...err};
    //these errors are bydefault named as casterror
    if(error.name === 'CastError') error = handleCastErrorDB(error);
    if(error.code === 11000) error = handleDuplicateFieldDB(error);
    if(error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if(error.name === 'JsonWebTokenError') error = handleJWTWrongTokenError();
    if(error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    

    sendErrorProd(error, res);
  }
}