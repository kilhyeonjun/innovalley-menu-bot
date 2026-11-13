import 'reflect-metadata';
import { container } from 'tsyringe';

// Domain Interfaces
import { IMenuPostRepository, IDeliveryHistoryRepository } from '@domain/repositories';
import { ICrawlerService, ISlackService } from '@domain/services';

// Infrastructure Implementations
import {
  MenuPostRepository,
  DeliveryHistoryRepository,
  KakaoApiCrawlerService,
  SlackBotService,
} from '@infrastructure/index';

// Application Use Cases
import {
  CrawlWeeklyMenuUseCase,
  SendMenuToSlackUseCase,
  CheckAndSendMenuUseCase,
  GetCurrentMenuUseCase,
} from '@application/use-cases';
import { CronScheduler } from '@infrastructure/scheduling/CronScheduler';

/**
 * DI 컨테이너 설정
 */
export function setupContainer(): void {
  // Repositories
  container.registerSingleton<IMenuPostRepository>(
    IMenuPostRepository,
    MenuPostRepository
  );
  container.registerSingleton<IDeliveryHistoryRepository>(
    IDeliveryHistoryRepository,
    DeliveryHistoryRepository
  );

  // Services
  container.registerSingleton<ICrawlerService>(
    ICrawlerService,
    KakaoApiCrawlerService
  );
  container.registerSingleton(SlackBotService);
  container.register<ISlackService>(ISlackService, { useToken: SlackBotService });

  // Use Cases (자동 해결)
  container.register(CrawlWeeklyMenuUseCase, { useClass: CrawlWeeklyMenuUseCase });
  container.register(SendMenuToSlackUseCase, { useClass: SendMenuToSlackUseCase });
  container.registerSingleton(CheckAndSendMenuUseCase);
  container.registerSingleton(CronScheduler);
  container.register(GetCurrentMenuUseCase, { useClass: GetCurrentMenuUseCase });
}

export { container };
