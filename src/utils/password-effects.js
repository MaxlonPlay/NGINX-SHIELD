const PASS_CONFIG = {
  TOTAL_ANIMATION_TIME: 500,
  FRAME_RATE: 30,
  CHARS: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&",
};

export function animatePasswordReveal(inputElement) {
  const originalValue = inputElement.value;
  if (!originalValue) return;

  let iterations = 0;
  const totalSteps = originalValue.length;
  const increment =
    totalSteps / (PASS_CONFIG.TOTAL_ANIMATION_TIME / PASS_CONFIG.FRAME_RATE);

  if (inputElement.dataset.intervalId) {
    clearInterval(parseInt(inputElement.dataset.intervalId));
  }

  const intervalId = setInterval(() => {
    inputElement.value = originalValue
      .split("")
      .map((letter, index) => {
        if (index < iterations) return originalValue[index];
        return PASS_CONFIG.CHARS[
          Math.floor(Math.random() * PASS_CONFIG.CHARS.length)
        ];
      })
      .join("");

    if (iterations >= totalSteps) {
      clearInterval(intervalId);
      inputElement.value = originalValue;
    }
    iterations += increment;
  }, PASS_CONFIG.FRAME_RATE);

  inputElement.dataset.intervalId = intervalId;
}
