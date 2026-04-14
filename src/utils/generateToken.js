const generateToken = (doctor) => {
  return jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",  // Token expires in 1 day
  });
};