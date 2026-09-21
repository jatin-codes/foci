import { Router, type Request } from 'express';
import {
  OWNER_HEADER,
  TOTAL_COUNT_HEADER,
  type TodoResource,
} from '../../../../shared/contract.js';
import type { TodoService } from '../../application/todoService.js';
import {
  createTodoSchema,
  listTodosQuerySchema,
  ownerIdSchema,
  updateTodoSchema,
} from '../schemas.js';
import { validate } from '../validation.js';

function ownerOf(req: Request): string {
  return validate(ownerIdSchema, req.get(OWNER_HEADER));
}

export function createTodoApiRouter(service: TodoService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const todo = await service.create(ownerOf(req), validate(createTodoSchema, req.body));
    res
      .status(201)
      .location(`${req.baseUrl}/${todo.id}`)
      .json(todo satisfies TodoResource);
  });

  router.get('/', async (req, res) => {
    const query = validate(listTodosQuerySchema, req.query);
    const { todos, total } = await service.list(ownerOf(req), query);
    res.set(TOTAL_COUNT_HEADER, String(total)).json(todos satisfies TodoResource[]);
  });

  router.get('/:id', async (req, res) => {
    res.json((await service.get(ownerOf(req), req.params.id)) satisfies TodoResource);
  });

  router.patch('/:id', async (req, res) => {
    const changes = validate(updateTodoSchema, req.body);
    res.json((await service.update(ownerOf(req), req.params.id, changes)) satisfies TodoResource);
  });

  router.post('/:id/complete', async (req, res) => {
    res.json((await service.markCompleted(ownerOf(req), req.params.id)) satisfies TodoResource);
  });

  router.post('/:id/incomplete', async (req, res) => {
    res.json((await service.markIncomplete(ownerOf(req), req.params.id)) satisfies TodoResource);
  });

  router.delete('/:id', async (req, res) => {
    await service.delete(ownerOf(req), req.params.id);
    res.status(204).end();
  });

  return router;
}
