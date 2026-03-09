// 景田天然矿泉水网站主JavaScript文件

document.addEventListener('DOMContentLoaded', function() {
  // 初始化购物车功能
  initCart();

  // 初始化产品交互
  initProductInteractions();

  // 初始化表单验证
  initFormValidation();

  // 初始化移动端菜单
  initMobileMenu();
});

// 购物车功能
function initCart() {
  const cartButtons = document.querySelectorAll('.add-to-cart');
  const cartCount = document.querySelector('.cart-count');

  cartButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const productId = this.dataset.productId;
      const productName = this.dataset.productName;

      try {
        const response = await fetch('/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: productId,
            quantity: 1
          })
        });

        const result = await response.json();

        if (result.success) {
          showAlert(`${productName} 已加入购物车`, 'success');
          updateCartCount(result.cartCount);
        } else {
          showAlert(result.message || '添加失败', 'danger');
        }
      } catch (error) {
        console.error('添加购物车失败:', error);
        showAlert('网络错误，请稍后重试', 'danger');
      }
    });
  });
}

// 更新购物车数量显示
function updateCartCount(count) {
  const cartCount = document.querySelector('.cart-count');
  if (cartCount) {
    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? 'flex' : 'none';
  }
}

// 产品交互功能
function initProductInteractions() {
  // 产品数量控制
  const quantityControls = document.querySelectorAll('.quantity-control');

  quantityControls.forEach(control => {
    const minusBtn = control.querySelector('.quantity-minus');
    const plusBtn = control.querySelector('.quantity-plus');
    const quantityInput = control.querySelector('.quantity-input');

    if (minusBtn && plusBtn && quantityInput) {
      minusBtn.addEventListener('click', () => {
        let value = parseInt(quantityInput.value) || 1;
        if (value > 1) {
          quantityInput.value = value - 1;
        }
      });

      plusBtn.addEventListener('click', () => {
        let value = parseInt(quantityInput.value) || 1;
        quantityInput.value = value + 1;
      });

      quantityInput.addEventListener('change', () => {
        let value = parseInt(quantityInput.value) || 1;
        if (value < 1) {
          quantityInput.value = 1;
        }
      });
    }
  });
}

// 表单验证
function initFormValidation() {
  const forms = document.querySelectorAll('form[data-validate]');

  forms.forEach(form => {
    form.addEventListener('submit', function(event) {
      if (!validateForm(this)) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  });
}

function validateForm(form) {
  let isValid = true;
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');

  inputs.forEach(input => {
    const errorElement = input.nextElementSibling?.classList.contains('error-message')
      ? input.nextElementSibling
      : null;

    // 清除之前的错误状态
    input.classList.remove('is-invalid');
    if (errorElement) {
      errorElement.remove();
    }

    // 验证必填字段
    if (!input.value.trim()) {
      showFieldError(input, '此字段为必填项');
      isValid = false;
    }

    // 验证邮箱格式
    if (input.type === 'email' && input.value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value)) {
        showFieldError(input, '请输入有效的邮箱地址');
        isValid = false;
      }
    }

    // 验证手机号格式
    if (input.type === 'tel' && input.value.trim()) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(input.value)) {
        showFieldError(input, '请输入有效的手机号码');
        isValid = false;
      }
    }
  });

  return isValid;
}

function showFieldError(input, message) {
  input.classList.add('is-invalid');

  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.style.color = '#e63757';
  errorElement.style.fontSize = '0.875rem';
  errorElement.style.marginTop = '0.25rem';
  errorElement.textContent = message;

  input.parentNode.appendChild(errorElement);
}

// 移动端菜单
function initMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });

    // 点击菜单项关闭菜单
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.classList.remove('active');
      });
    });
  }
}

// 显示消息提示
function showAlert(message, type = 'info') {
  // 创建提示元素
  const alertElement = document.createElement('div');
  alertElement.className = `alert alert-${type}`;
  alertElement.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    max-width: 400px;
    animation: slideIn 0.3s ease;
  `;

  alertElement.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()"
              style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: inherit;">
        &times;
      </button>
    </div>
  `;

  // 添加到页面
  document.body.appendChild(alertElement);

  // 3秒后自动移除
  setTimeout(() => {
    if (alertElement.parentNode) {
      alertElement.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (alertElement.parentNode) {
          alertElement.parentNode.removeChild(alertElement);
        }
      }, 300);
    }
  }, 3000);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .is-invalid {
    border-color: #e63757 !important;
  }

  @media (max-width: 768px) {
    .menu-toggle {
      display: block;
      background: none;
      border: none;
      font-size: 1.5rem;
      color: white;
      cursor: pointer;
    }

    .nav-menu {
      display: none;
      flex-direction: column;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--primary-color);
      padding: 1rem;
    }

    .nav-menu.active {
      display: flex;
    }
  }
`;
document.head.appendChild(style);

// 导出函数供其他脚本使用
window.showAlert = showAlert;
window.updateCartCount = updateCartCount;