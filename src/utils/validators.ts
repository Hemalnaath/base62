import * as z from 'zod';

/**
 * Programmatic high-performance Zod schema resolver for react-hook-form.
 * This completely isolates forms from needing external third-party hook-form resolvers packages.
 */
export const zodResolver = (schema: z.ZodSchema<any>) => async (values: any) => {
  try {
    const data = schema.parse(values);
    return {
      values: data,
      errors: {}
    };
  } catch (error: any) {
    const errors: any = {};
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((issue: any) => {
        const path = issue.path.join('.');
        errors[path] = {
          type: issue.code,
          message: issue.message
        };
      });
    } else {
      errors['_form'] = {
        type: 'validation_error',
        message: error.message || 'Validation failed.'
      };
    }
    return {
      values: {},
      errors
    };
  }
};
export default zodResolver;
