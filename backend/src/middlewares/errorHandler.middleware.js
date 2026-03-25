export const errorHandler = (err, req, res, next) => {

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      success: false,
      message: `${err.errors[0].path} already exists`
    });
  }

  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: err.errors.map(e => e.message).join(", ")
    });
  }

  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
};