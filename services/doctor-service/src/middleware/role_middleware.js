function allowRoles(...roles) {
  return (req, res, next) => {
    const role = req.doctor?.role || req.role;

    if (!role) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!roles.includes(role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }

    next();
  };
}

module.exports = { allowRoles };