import { WAIT_FOR_TRIES, waitFor } from "./utils.js";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("waitFor rejects after checking fn WAIT_FOR_TRIES times", async () => {
  const fn = jest.fn(() => false);
  const done = expect(waitFor(fn)).rejects.toBeUndefined();
  jest.runAllTimers();
  await done;
  expect(fn).toHaveBeenCalledTimes(WAIT_FOR_TRIES);
});

test("waitFor resolves when fn first returns true on the last try", async () => {
  let calls = 0;
  const done = expect(waitFor(() => ++calls === WAIT_FOR_TRIES)).resolves.toBeUndefined();
  jest.runAllTimers();
  await done;
});
