import { InMemoryTodoRepository } from '../../src/infrastructure/inMemoryTodoRepository.js';
import { describeTodoRepositoryContract } from '../support/todoRepositoryContract.js';

describeTodoRepositoryContract('InMemoryTodoRepository', () => new InMemoryTodoRepository());
