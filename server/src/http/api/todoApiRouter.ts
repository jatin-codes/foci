import { Router, type Request } from 'express';
import type { TodoService } from '../../application/todoService.js';
import {
  createTodoSchema,
  listTodosQuerySchema,
  OWNER_HEADER,
  ownerIdSchema,
  updateTodoSchema,
} from '../schemas.js';
import { validate } from '../validation.js';

function ownerOf(req: Request): string {
  return validate(ownerIdSchema, req.get(OWNER_HEADER));
}

/**
 * The JSON API. Every route acts on one owner's list, named by a header. Handlers
 * only translate between HTTP and the use cases: errors they throw (or reject
 * with) are turned into responses by the error handler.
 */
export function createTodoApiRouter(service: TodoService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const todo = await service.create(ownerOf(req), validate(createTodoSchema, req.body));
    res.status(201).location(`${req.baseUrl}/${todo.id}`).json(todo);
  });

  router.get('/', async (req, res) => {
    res.json(await service.list(ownerOf(req), validate(listTodosQuerySchema, req.query)));
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(ownerOf(req), req.params.id));
  });

  router.patch('/:id', async (req, res) => {
    res.json(
      await service.update(ownerOf(req), req.params.id, validate(updateTodoSchema, req.body)),
    );
  });

  router.post('/:id/complete', async (req, res) => {
    res.json(await service.markCompleted(ownerOf(req), req.params.id));
  });

  router.post('/:id/incomplete', async (req, res) => {
    res.json(await service.markIncomplete(ownerOf(req), req.params.id));
  });

  router.delete('/:id', async (req, res) => {
    await service.delete(ownerOf(req), req.params.id);
    res.status(204).end();
  });

  return router;
}
