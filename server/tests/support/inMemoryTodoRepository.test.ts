import { InMemoryTodoRepository } from './inMemoryTodoRepository.js';
import { describeTodoRepositoryContract } from './todoRepositoryContract.js';

describeTodoRepositoryContract('InMemoryTodoRepository', () => new InMemoryTodoRepository());
