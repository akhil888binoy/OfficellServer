export const parseSkip = (value: unknown) => {
    const skip = Number(value);
    return Number.isSafeInteger(skip) && skip >= 0 ? skip : 0;
};
