import React, { useState } from 'react';
import { Lightbulb, MessageCircle, AlertCircle } from 'lucide-react';
import SuggestIdeaModal from './SuggestIdeaModal';

const Footer: React.FC = () => {
  const [isSuggestIdeaModalOpen, setIsSuggestIdeaModalOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                This is a beta version of the project. Bugs are possible.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AC</span>
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">Agent Core</span>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Follow us on Telegram:</h4>
                <div className="flex flex-col space-y-2">
                  <a
                    href="https://t.me/auutotimo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>@auutotimo</span>
                  </a>
                  <a
                    href="https://t.me/dimaraketa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>@dimaraketa</span>
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
              <button
                onClick={() => setIsSuggestIdeaModalOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-1 font-medium"
              >
                <Lightbulb className="h-4 w-4" />
                <span>Suggest an Idea</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <span className="text-sm text-gray-600">© {currentYear} Agent Core</span>
          </div>
        </div>
      </footer>

      <SuggestIdeaModal
        isOpen={isSuggestIdeaModalOpen}
        onClose={() => setIsSuggestIdeaModalOpen(false)}
      />
    </>
  );
};

export default Footer;