export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json(req.user);
  } catch (error) {
    console.error(`[getCurrentUser] ${error.message}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};
