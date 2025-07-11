// app.js (versão com Router)
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');

// Criar o router em vez do app
const router = express.Router();

// Configuração do banco de dados
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Criar a pasta uploads se não existir
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Pasta uploads criada com sucesso');
}

// Middleware para uploads das imagens dos produtos
router.use(cors());
router.use(bodyParser.json());
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const productUpload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Limite de 5MB
    }
});

// Função para inserir produto reutilizando ID
async function insertProduct(name, category, price, original_price = null, description = '', full_description = '') {
    const connection = await pool.getConnection();
    try {
        // Verificar o menor ID disponível
        const [rows] = await connection.query(`
            SELECT MIN(t1.id + 1) AS next_id 
            FROM products t1 
            LEFT JOIN products t2 ON t1.id + 1 = t2.id 
            WHERE t2.id IS NULL
        `);

        const nextId = rows[0].next_id || 1;

        // Inserir o produto com o ID reutilizado
        await connection.query(`
            INSERT INTO products (id, name, category, price, original_price, description, full_description) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [nextId, name, category, price, original_price, description, full_description]);

        console.log(`Produto inserido com ID: ${nextId}`);
    } catch (error) {
        console.error('Erro ao inserir produto:', error);
    } finally {
        connection.release();
    }
}

// Rotas da API
// Listar todos os produtos
router.get('/products', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        try {
            // Buscar produtos básicos
            const [products] = await connection.query('SELECT * FROM products ORDER BY created_at DESC');

            // Para cada produto, buscar especificações, variantes, imagens e tamanhos
            for (let product of products) {
                // Especificações
                const [specs] = await connection.query(
                    'SELECT name, value FROM product_specs WHERE product_id = ?',
                    [product.id]
                );
                product.specs = specs;

                // Variantes
                const [variants] = await connection.query(
                    'SELECT * FROM product_variants WHERE product_id = ?',
                    [product.id]
                );

                // Para cada variante, buscar imagens e tamanhos
                for (let variant of variants) {
                    const [images] = await connection.query(
                        'SELECT image_url FROM variant_images WHERE variant_id = ?',
                        [variant.id]
                    );
                    variant.images = images.map(img => img.image_url);

                    const [sizes] = await connection.query(
                        'SELECT size_name as name, size_name as id, stock FROM variant_sizes WHERE variant_id = ?',
                        [variant.id]
                    );
                    variant.sizes = sizes;

                    // Formatar objeto de cor
                    variant.color = {
                        name: variant.color_name,
                        code: variant.color_code
                    };
                    delete variant.color_name;
                    delete variant.color_code;
                }

                product.variants = variants;

                // Determinar imagens principais (pegar a primeira imagem da primeira variante)
                if (variants.length > 0 && variants[0].images.length > 0) {
                    product.images = [variants[0].images[0]];
                } else {
                    product.images = [];
                }
            }

            res.json(products);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// Obter um produto específico
router.get('/products/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const productId = req.params.id;

        try {
            // Buscar produto básico
            const [products] = await connection.query(
                'SELECT * FROM products WHERE id = ?',
                [productId]
            );

            if (products.length === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            const product = products[0];

            // Especificações
            const [specs] = await connection.query(
                'SELECT name, value FROM product_specs WHERE product_id = ?',
                [product.id]
            );
            product.specs = specs;

            // Variantes
            const [variants] = await connection.query(
                'SELECT * FROM product_variants WHERE product_id = ?',
                [product.id]
            );

            // Para cada variante, buscar imagens e tamanhos
            for (let variant of variants) {
                const [images] = await connection.query(
                    'SELECT image_url FROM variant_images WHERE variant_id = ?',
                    [variant.id]
                );
                variant.images = images.map(img => img.image_url);

                const [sizes] = await connection.query(
                    'SELECT size_name as name, size_name as id, stock FROM variant_sizes WHERE variant_id = ?',
                    [variant.id]
                );
                variant.sizes = sizes;

                // Formatar objeto de cor
                variant.color = {
                    name: variant.color_name,
                    code: variant.color_code
                };
                delete variant.color_name;
                delete variant.color_code;
            }

            product.variants = variants;

            // Todas as imagens do produto (de todas as variantes)
            product.images = [];
            variants.forEach(variant => {
                product.images.push(...variant.images);
            });

            res.json(product);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

// Criar um novo produto
router.post('/products', async (req, res) => {
    const transaction = await pool.getConnection();
    try {
        await transaction.beginTransaction();

        const {
            name,
            category,
            price,
            originalPrice,
            description,
            fullDescription,
            specs,
            variants
        } = req.body;

        // Inserir produto básico
        const [productResult] = await transaction.query(
            `INSERT INTO products 
            (name, category, price, original_price, description, full_description) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [name, category, price, originalPrice || null, description, fullDescription || '']
        );

        const productId = productResult.insertId;

        // Inserir especificações
        if (specs && specs.length > 0) {
            for (const spec of specs) {
                await transaction.query(
                    `INSERT INTO product_specs 
                    (product_id, name, value) 
                    VALUES (?, ?, ?)`,
                    [productId, spec.name, spec.value]
                );
            }
        }

        // Inserir variantes
        if (variants && variants.length > 0) {
            for (const variant of variants) {
                const [variantResult] = await transaction.query(
                    `INSERT INTO product_variants 
                    (product_id, color_name, color_code) 
                    VALUES (?, ?, ?)`,
                    [productId, variant.color.name, variant.color.code]
                );

                const variantId = variantResult.insertId;

                // Inserir imagens da variante
                if (variant.images && variant.images.length > 0) {
                    for (const imageUrl of variant.images) {
                        await transaction.query(
                            `INSERT INTO variant_images 
                            (variant_id, image_url) 
                            VALUES (?, ?)`,
                            [variantId, imageUrl]
                        );
                    }
                }

                // Inserir tamanhos da variante
                if (variant.sizes && variant.sizes.length > 0) {
                    for (const size of variant.sizes) {
                        await transaction.query(
                            `INSERT INTO variant_sizes 
                            (variant_id, size_name, stock) 
                            VALUES (?, ?, ?)`,
                            [variantId, size.name, size.stock || 0]
                        );
                    }
                }
            }
        }

        await transaction.commit();

        // Retornar o produto criado
        const [newProduct] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        res.status(201).json(newProduct[0]);
    } catch (error) {
        await transaction.rollback();
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro ao criar produto' });
    } finally {
        transaction.release();
    }
});

// Atualizar um produto existente
router.put('/products/:id', async (req, res) => {
    const transaction = await pool.getConnection();
    try {
        await transaction.beginTransaction();

        const productId = req.params.id;
        const {
            name,
            category,
            price,
            originalPrice,
            description,
            fullDescription,
            specs,
            variants
        } = req.body;

        // Atualizar produto básico
        await transaction.query(
            `UPDATE products SET 
            name = ?, 
            category = ?, 
            price = ?, 
            original_price = ?, 
            description = ?, 
            full_description = ? 
            WHERE id = ?`,
            [name, category, price, originalPrice || null, description, fullDescription || '', productId]
        );

        // Remover especificações antigas e adicionar novas
        await transaction.query(
            'DELETE FROM product_specs WHERE product_id = ?',
            [productId]
        );

        if (specs && specs.length > 0) {
            for (const spec of specs) {
                await transaction.query(
                    `INSERT INTO product_specs 
                    (product_id, name, value) 
                    VALUES (?, ?, ?)`,
                    [productId, spec.name, spec.value]
                );
            }
        }

        // Obter variantes existentes para comparação
        const [existingVariants] = await transaction.query(
            'SELECT id FROM product_variants WHERE product_id = ?',
            [productId]
        );

        const existingVariantIds = existingVariants.map(v => v.id);
        const newVariantIds = variants.map(v => v.id).filter(id => id);

        // Variantes para remover (existem no banco mas não na requisição)
        const variantsToRemove = existingVariantIds.filter(id => !newVariantIds.includes(id));

        if (variantsToRemove.length > 0) {
            await transaction.query(
                'DELETE FROM product_variants WHERE id IN (?)',
                [variantsToRemove]
            );
        }

        // Processar variantes
        if (variants && variants.length > 0) {
            for (const variant of variants) {
                if (variant.id) {
                    // Atualizar variante existente
                    await transaction.query(
                        `UPDATE product_variants SET 
                        color_name = ?, 
                        color_code = ? 
                        WHERE id = ?`,
                        [variant.color.name, variant.color.code, variant.id]
                    );

                    const variantId = variant.id;

                    // Remover imagens antigas e adicionar novas
                    await transaction.query(
                        'DELETE FROM variant_images WHERE variant_id = ?',
                        [variantId]
                    );

                    if (variant.images && variant.images.length > 0) {
                        for (const imageUrl of variant.images) {
                            await transaction.query(
                                `INSERT INTO variant_images 
                                (variant_id, image_url) 
                                VALUES (?, ?)`,
                                [variantId, imageUrl]
                            );
                        }
                    }

                    // Remover tamanhos antigos e adicionar novos
                    await transaction.query(
                        'DELETE FROM variant_sizes WHERE variant_id = ?',
                        [variantId]
                    );

                    if (variant.sizes && variant.sizes.length > 0) {
                        for (const size of variant.sizes) {
                            await transaction.query(
                                `INSERT INTO variant_sizes 
                                (variant_id, size_name, stock) 
                                VALUES (?, ?, ?)`,
                                [variantId, size.name, size.stock || 0]
                            );
                        }
                    }
                } else {
                    // Nova variante
                    const [variantResult] = await transaction.query(
                        `INSERT INTO product_variants 
                        (product_id, color_name, color_code) 
                        VALUES (?, ?, ?)`,
                        [productId, variant.color.name, variant.color.code]
                    );

                    const variantId = variantResult.insertId;

                    // Inserir imagens
                    if (variant.images && variant.images.length > 0) {
                        for (const imageUrl of variant.images) {
                            await transaction.query(
                                `INSERT INTO variant_images 
                                (variant_id, image_url) 
                                VALUES (?, ?)`,
                                [variantId, imageUrl]
                            );
                        }
                    }

                    // Inserir tamanhos
                    if (variant.sizes && variant.sizes.length > 0) {
                        for (const size of variant.sizes) {
                            await transaction.query(
                                `INSERT INTO variant_sizes 
                                (variant_id, size_name, stock) 
                                VALUES (?, ?, ?)`,
                                [variantId, size.name, size.stock || 0]
                            );
                        }
                    }
                }
            }
        }

        await transaction.commit();

        // Retornar o produto atualizado
        const [updatedProduct] = await pool.query(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        await transaction.commit();

        // Limpar imagens após a atualização
        await cleanupOrphanedImages(pool);

        res.json(updatedProduct[0]);
    } catch (error) {
        await transaction.rollback();
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    } finally {
        transaction.release();
    }
});

// Deletar um produto
router.delete('/products/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const productId = req.params.id;

        try {
            // Verificar se o produto existe
            const [products] = await connection.query(
                'SELECT id FROM products WHERE id = ?',
                [productId]
            );

            if (products.length === 0) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            // Deletar produto (as FK com CASCADE vão deletar os registros relacionados)
            await connection.query(
                'DELETE FROM products WHERE id = ?',
                [productId]
            );

            res.json({ message: 'Produto deletado com sucesso' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro ao deletar produto' });
    }
});

// Upload de imagens
router.post('/upload', productUpload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada' });
        }

        const imageUrls = req.files.map(file => {
            // Retorna a URL completa
            return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        });

        res.json({ imageUrls });
    } catch (error) {
        console.error('Erro ao fazer upload de imagens:', error);
        res.status(500).json({ error: 'Erro ao fazer upload de imagens' });
    }
});

// Adicione esta rota para deletar imagens
router.delete('/images/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        
        console.log('Tentando excluir:', filePath); // Log para depuração
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Arquivo excluído com sucesso:', filename); // Log de sucesso
            res.json({ success: true, message: 'Imagem deletada com sucesso' });
        } else {
            console.log('Arquivo não encontrado:', filename); // Log de arquivo não encontrado
            res.status(404).json({ error: 'Arquivo não encontrado' });
        }
    } catch (error) {
        console.error('Erro detalhado ao deletar imagem:', error); // Log detalhado de erro
        res.status(500).json({ error: 'Erro ao deletar imagem' });
    }
});

// Função auxiliar para deletar múltiplas imagens
async function deleteVariantImages(variantId, connection) {
    // Busca todas as imagens da variante
    const [images] = await connection.query(
        'SELECT image_url FROM variant_images WHERE variant_id = ?',
        [variantId]
    );

    // Deleta cada imagem do sistema de arquivos
    for (const image of images) {
        const filename = image.image_url.split('/').pop();
        const filePath = path.join(__dirname, 'uploads', filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Imagem removida: ${filename}`);
        }
    }

    // Deleta os registros do banco de dados
    await connection.query(
        'DELETE FROM variant_images WHERE variant_id = ?',
        [variantId]
    );
}

// Rota de DELETE de produtos
router.delete('/products/:id', async (req, res) => {
    const transaction = await pool.getConnection();
    try {
        await transaction.beginTransaction();

        const productId = req.params.id;

        // 1. Buscar todas as variantes do produto
        const [variants] = await transaction.query(
            'SELECT id FROM product_variants WHERE product_id = ?',
            [productId]
        );

        // 2. Para cada variante, deletar suas imagens
        for (const variant of variants) {
            await deleteVariantImages(variant.id, transaction);
        }

        // 3. Deletar o produto (CASCADE vai deletar variantes, tamanhos e especificações)
        await transaction.query(
            'DELETE FROM products WHERE id = ?',
            [productId]
        );

        await transaction.commit();
        res.json({ message: 'Produto e todas as suas imagens deletados com sucesso' });
    } catch (error) {
        await transaction.rollback();
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro ao deletar produto' });
    } finally {
        transaction.release();
    }
});

// Adicionar rota para deletar variante
router.delete('/variants/:id', async (req, res) => {
    const transaction = await pool.getConnection();
    try {
        await transaction.beginTransaction();
        const variantId = req.params.id;

        // 1. Deletar as imagens da variante
        await deleteVariantImages(variantId, transaction);

        // 2. Deletar a variante (CASCADE vai deletar os tamanhos)
        await transaction.query(
            'DELETE FROM product_variants WHERE id = ?',
            [variantId]
        );

        await transaction.commit();

        // 3. Limpar imagens órfãs (usando uma nova conexão)
        const cleanupConnection = await pool.getConnection();
        try {
            await cleanupOrphanedImages(cleanupConnection);
        } finally {
            cleanupConnection.release();
        }

        res.json({ message: 'Variante e todas as suas imagens deletadas com sucesso' });
    } catch (error) {
        await transaction.rollback();
        console.error('Erro ao deletar variante:', error);
        res.status(500).json({ error: 'Erro ao deletar variante' });
    } finally {
        transaction.release();
    }
});

async function cleanupOrphanedImages(connection) {
    try {
        // Busca todas as URLs de imagens no banco de dados
        const [dbImages] = await connection.query(
            'SELECT image_url FROM variant_images'
        );

        const dbImageFilenames = dbImages.map(img =>
            img.image_url.split('/').pop()
        );

        // Lista todos os arquivos na pasta uploads
        const uploadsDir = path.join(__dirname, 'uploads');
        const filesInUploads = fs.readdirSync(uploadsDir);

        // Remove arquivos que não estão no banco de dados
        for (const file of filesInUploads) {
            if (!dbImageFilenames.includes(file)) {
                const filePath = path.join(uploadsDir, file);
                fs.unlinkSync(filePath);
                console.log(`Imagem SemPai removida: ${file}`);
            }
        }
    } catch (error) {
        console.error('Erro ao limpar imagens SemPai:', error);
        throw error; // Propaga o erro para ser tratado no chamador
    }
}

// Teste de conexão com o MySQL
(async () => {
    try {
      const connection = await pool.getConnection();
      console.log('✅App.js conectado ao MySQL com sucesso!🥳🎉');
      connection.release();
    } catch (error) {
      console.error('❌Erro de conexão❌:', error);
      process.exit(1);
    }
})();













// Exportar o router em vez do app
module.exports = router;