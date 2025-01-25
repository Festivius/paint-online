const robot = require("robotjs");
const sleep = require("sleep");

// List of functions to randomly type
const lst = ["len", "str", "ord", "chr", "reversed", "sorted", "all", "any", "input", "print"];

// Function to generate random text
function generateRandomText() {
  const func = lst[getRandomInt(0, lst.length - 1)];
  const argument = '"' + generateRandomString(getRandomInt(2, 10)) + '"';
  return `${func}(${argument});`;
}

// Function to generate a random string of letters
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(getRandomInt(0, chars.length - 1));
  }
  return result;
}

// Helper function to generate a random integer between min (inclusive) and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to simulate key presses
function simulateKeystrokes(text) {
  for (let i = 0; i < text.length; i++) {
    let char = text.charAt(i);
    if (char === "(") {
      robot.typeString("(");  // Use typeString instead of keyTap for brackets
    } else if (char === ")") {
      robot.typeString(")");  // Use typeString instead of keyTap for brackets
    } else {
      robot.typeString(char);
    }
    sleep.msleep(getRandomInt(50, 200));  // Random sleep between 50ms and 200ms
  }
}

// Main function to automate typing
async function main() {
  // Wait for a brief moment before starting (optional)
  sleep.msleep(5000);  // Sleep for 2 seconds

  // Main loop
  while (true) {
    // Generate random function call
    const randomText = generateRandomText();

    try {
      // Simulate typing
      simulateKeystrokes(randomText);

      // Press Enter after typing
      robot.keyTap("enter");

      // Optional: Move and click (adjust coordinates as needed)
      robot.moveMouse(600, 600);
      robot.mouseClick();

    } catch (e) {
      console.error(`Error during typing: ${e}`);
      break;
    }

    // Wait before generating the next text (random sleep between 30 and 55 seconds)
    sleep.msleep(getRandomInt(30000, 55000));  // Sleep for 30 to 55 seconds

    // Click again after the delay
    robot.moveMouse(600, 600);
    robot.mouseClick();
  }
}

main();
