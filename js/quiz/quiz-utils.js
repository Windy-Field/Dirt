const OPTION_KEYS = ["A", "B", "C", "D"];

// 显示顺序可以随机，但保留原选项编号，提交时才能正确判题。
export function shuffleOptions(question) {
  const options = [];
  for (let index = 0; index < OPTION_KEYS.length; index += 1) {
    const originalKey = OPTION_KEYS[index];
    const option = {
      originalKey: originalKey,
      text: question[`option${originalKey}`],
    };
    options.push(option);
  }

  for (let index = options.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentOption = options[index];
    options[index] = options[randomIndex];
    options[randomIndex] = currentOption;
  }

  const displayOptions = [];
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const displayOption = {
      originalKey: option.originalKey,
      text: option.text,
      displayKey: OPTION_KEYS[index],
      displayId: `${question.id}-${index}`,
    };
    displayOptions.push(displayOption);
  }
  return displayOptions;
}

// 判断题目的选项文字是否较长，用来切换更合适的页面样式。
export function hasLongOption(question) {
  for (let index = 0; index < OPTION_KEYS.length; index += 1) {
    const key = OPTION_KEYS[index];
    const optionText = String(question[`option${key}`] || "");
    if (optionText.length > 28) {
      return true;
    }
  }
  return false;
}
