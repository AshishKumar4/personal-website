export function bentoRows(n: number): number[][] {
  const pattern = [[7, 5], [5, 7], [4, 4, 4]];
  const rows: number[][] = [];
  let left = n;
  let i = 0;
  while (left > 0) {
    const next = pattern[i % pattern.length];
    if (left >= next.length) {
      rows.push(next);
      left -= next.length;
      i++;
    } else if (left === 1) {
      const last = rows[rows.length - 1];
      if (last && last.length === 3) {
        rows.pop();
        rows.push([6, 6], [6, 6]);
      } else rows.push([12]);
      left = 0;
    } else {
      rows.push([6, 6]);
      left -= 2;
    }
  }
  return rows;
}
