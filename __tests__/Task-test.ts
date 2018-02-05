import { Task } from '../src/Task';

type SquareCircleInputs = {
  someInput: number;
};

describe('Task', () => {
  describe('from()', () => {
    it('should create a task from an id, input map, and run function.', () => {
      const t: Task<SquareCircleInputs, number> = Task.from(
        'squareCircle',
        {someInput: 123},
        ({someInput}) => someInput / Math.PI ** 0.5,
      );
      expect(t.inputs).toEqual(['someInput']);
      expect(t.id).toBe('squareCircle');
      expect(t.run({someInput: Math.PI ** 0.5})).toBe(1);
    });
  });
});
