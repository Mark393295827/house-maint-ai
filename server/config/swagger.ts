import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'House Maintenance AI API',
            version: '1.0.0',
            description: 'API documentation for the House Maintenance AI application',
            contact: {
                name: 'API Support',
                email: 'support@example.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Local Development Server',
            },
            {
                url: 'https://api.production.com',
                description: 'Production Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./routes/*.ts', './server/routes/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
