"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bootstrap;
const cors_1 = __importDefault(require("cors"));
const config_1 = __importDefault(require("./config"));
function bootstrap(app, express) {
    // CORS configuration
    const corsOptions = {
        origin: '*', // Consider restricting this in production
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    };
    // Apply middleware
    app.use((0, cors_1.default)(corsOptions));
    app.use(express.json());
    app.listen(config_1.default.port, () => {
        console.log(`Server is running on port ${config_1.default.port}`);
    });
}
