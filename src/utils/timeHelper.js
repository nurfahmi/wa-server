// Helper function to get current Jakarta time
function getJakartaTime() {
  const date = new Date();
  return new Date(
    date.toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    })
  );
}

// Helper function to convert any date to Jakarta timezone
function toJakartaTime(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return new Date(
    date.toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    })
  );
}

export {
  getJakartaTime,
  toJakartaTime,
};
