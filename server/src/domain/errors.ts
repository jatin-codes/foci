export class TodoNotFoundError extends Error {
  constructor(readonly todoId: string) {
    super(`To-do with id "${todoId}" was not found`);
    this.name = 'TodoNotFoundError';
  }
}
