import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer Not Found');
    }

    const productsID = products.map(product => {
      return { id: product.id };
    });

    const productsSelectted = await this.productsRepository.findAllById(
      productsID,
    );

    if (productsSelectted.length !== products.length) {
      throw new AppError('Product is missing');
    }

    const productsFormatted = productsSelectted.map(product => {
      const productList = products.find(pFind => pFind.id === product.id);
      if (!productList) {
        throw new AppError('Product not found');
      }

      if (product.quantity < productList.quantity) {
        throw new AppError('Product out of stock');
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: productList?.quantity || 0,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsFormatted,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateProductService;
