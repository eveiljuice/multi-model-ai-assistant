/**
 * Telegram Bot Service for sending notifications
 * Handles notifications for payments, subscriptions, and other events
 */

interface TelegramMessage {
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  disable_web_page_preview?: boolean;
}

interface PaymentNotification {
  userId: string;
  userEmail: string;
  productName: string;
  amount: number;
  credits?: number;
  sessionId: string;
  mode: 'subscription' | 'payment';
}

export class TelegramService {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly baseUrl: string;

  constructor() {
    this.botToken = '7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA';
    this.chatId = '-1002604809855';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Send a message to the configured Telegram chat
   */
  private async sendMessage(message: TelegramMessage): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message.text,
          parse_mode: message.parse_mode || 'HTML',
          disable_web_page_preview: message.disable_web_page_preview !== false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Telegram API error:', errorData);
        return false;
      }

      const result = await response.json();
      console.log('✅ Telegram message sent successfully:', result.result.message_id);
      return true;
    } catch (error) {
      console.error('❌ Failed to send Telegram message:', error);
      return false;
    }
  }

  /**
   * Format and send payment notification
   */
  async notifyPayment(payment: PaymentNotification): Promise<boolean> {
    try {
      const isSubscription = payment.mode === 'subscription';
      const amountFormatted = (payment.amount / 100).toFixed(2);
      
      let message = `💰 <b>Новая оплата в Donein5!</b>\n\n`;
      
      if (isSubscription) {
        message += `🔄 <b>Тип:</b> Подписка\n`;
        message += `📦 <b>Продукт:</b> ${payment.productName}\n`;
        message += `💵 <b>Сумма:</b> $${amountFormatted}/месяц\n`;
        if (payment.credits) {
          message += `⚡ <b>Кредиты:</b> ${payment.credits} в месяц\n`;
        }
      } else {
        message += `🛒 <b>Тип:</b> Разовая покупка\n`;
        message += `📦 <b>Продукт:</b> ${payment.productName}\n`;
        message += `💵 <b>Сумма:</b> $${amountFormatted}\n`;
        if (payment.credits) {
          message += `⚡ <b>Кредиты:</b> ${payment.credits}\n`;
          message += `💎 <b>Цена за кредит:</b> $${(payment.amount / 100 / payment.credits).toFixed(3)}\n`;
        }
      }
      
      message += `\n👤 <b>Пользователь:</b>\n`;
      message += `   📧 ${payment.userEmail}\n`;
      message += `   🆔 ${payment.userId}\n`;
      
      message += `\n🧾 <b>Stripe Session:</b> <code>${payment.sessionId}</code>\n`;
      message += `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n`;
      
      message += `\n---\n`;
      message += `<i>💫 Отправлено из Donein5 Payment System</i>`;

      return await this.sendMessage({
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    } catch (error) {
      console.error('❌ Error formatting payment notification:', error);
      return false;
    }
  }

  /**
   * Send subscription cancellation notification
   */
  async notifySubscriptionCancelled(userId: string, userEmail: string, subscriptionId: string): Promise<boolean> {
    try {
      const message = `🚫 <b>Подписка отменена</b>\n\n` +
        `👤 <b>Пользователь:</b>\n` +
        `   📧 ${userEmail}\n` +
        `   🆔 ${userId}\n\n` +
        `🔄 <b>Subscription ID:</b> <code>${subscriptionId}</code>\n` +
        `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
        `---\n` +
        `<i>💫 Отправлено из Donein5 Payment System</i>`;

      return await this.sendMessage({
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    } catch (error) {
      console.error('❌ Error sending subscription cancellation notification:', error);
      return false;
    }
  }

  /**
   * Send payment failure notification
   */
  async notifyPaymentFailed(userId: string, userEmail: string, sessionId: string, error: string): Promise<boolean> {
    try {
      const message = `❌ <b>Ошибка оплаты</b>\n\n` +
        `👤 <b>Пользователь:</b>\n` +
        `   📧 ${userEmail}\n` +
        `   🆔 ${userId}\n\n` +
        `🧾 <b>Session ID:</b> <code>${sessionId}</code>\n` +
        `⚠️ <b>Ошибка:</b> ${error}\n` +
        `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
        `---\n` +
        `<i>💫 Отправлено из Donein5 Payment System</i>`;

      return await this.sendMessage({
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    } catch (error) {
      console.error('❌ Error sending payment failure notification:', error);
      return false;
    }
  }

  /**
   * Test the Telegram service
   */
  async testConnection(): Promise<boolean> {
    try {
      const message = `🧪 <b>Test от Donein5</b>\n\n` +
        `✅ Telegram интеграция работает!\n` +
        `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

      return await this.sendMessage({
        text: message,
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('❌ Telegram test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const telegramService = new TelegramService();