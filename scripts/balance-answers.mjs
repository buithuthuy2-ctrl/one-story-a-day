import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const files = ["september.json", "october.json", "november.json"];

function permutations(values) {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, position) => position !== index))
      .map(rest => [value, ...rest])
  );
}

const answerPatterns = permutations([0, 1, 2, 3]);

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function isBalanced(questions) {
  return questions.length === 4
    && new Set(questions.map(question => question.answer_index)).size === 4;
}

for (const name of files) {
  const path = join("src", "data", name);
  const stories = JSON.parse(readFileSync(path, "utf8"));
  let changedStories = 0;
  let movedAnswers = 0;

  for (const story of stories) {
    const questions = [...story.questions].sort((a, b) => a.sort_order - b.sort_order);
    if (questions.length !== 4) {
      throw new Error(`${name}, ngày ${story.day}: cần đúng 4 câu trắc nghiệm.`);
    }
    if (questions.some(question => question.options.length !== 4
      || !Number.isInteger(question.answer_index)
      || question.answer_index < 0
      || question.answer_index > 3)) {
      throw new Error(`${name}, ngày ${story.day}: dữ liệu đáp án không hợp lệ.`);
    }
    if (isBalanced(questions)) continue;

    const oldAnswers = questions.map(question => question.options[question.answer_index]);
    const pattern = [...answerPatterns].sort((left, right) => {
      const leftMatches = left.filter((index, position) =>
        index === questions[position].answer_index).length;
      const rightMatches = right.filter((index, position) =>
        index === questions[position].answer_index).length;
      return rightMatches - leftMatches
        || hash(`${story.month}/${story.day}/${right.join("")}`)
          - hash(`${story.month}/${story.day}/${left.join("")}`);
    })[0];

    questions.forEach((question, position) => {
      const oldIndex = question.answer_index;
      const nextIndex = pattern[position];
      if (oldIndex === nextIndex) return;
      [question.options[oldIndex], question.options[nextIndex]] =
        [question.options[nextIndex], question.options[oldIndex]];
      question.answer_index = nextIndex;
      movedAnswers += 1;
      if (question.options[nextIndex] !== oldAnswers[position]) {
        throw new Error(`${name}, ngày ${story.day}: nội dung đáp án đúng đã thay đổi.`);
      }
    });
    if (!isBalanced(questions)) {
      throw new Error(`${name}, ngày ${story.day}: đáp án chưa được phân bổ A–D.`);
    }
    changedStories += 1;
  }

  writeFileSync(path, `${JSON.stringify(stories, null, 2)}\n`);
  process.stdout.write(`${name}: ${changedStories} truyện, ${movedAnswers} đáp án đã đổi vị trí\n`);
}
