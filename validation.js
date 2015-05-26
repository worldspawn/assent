(function () {
  function ValidatorRuleComponent(name, rule) { //function (obj, value) - return bool
    this.runForCollection = false;
    this.name = name;
    this.rule = rule;
    this.constraints = [];// function(obj) - return bool
  }

  ValidatorRuleComponent.prototype = {
    when: function (constraint) {
      this.constraints.push(constraint);
      return this;
    },
    canRun: function (obj) {
      var pass = true;
      for (constraint in this.constraints) {
        if (!this.constraints.hasOwnProperty(constraint)) {
          continue;
        }

        if (!this.constraints[constraint](obj)){
          pass = false;
          break;
        }
      }

      return pass;
    },
    isValid: function (obj, value) {
      return this.rule(obj, value);
    },
    withMessage: function (msg, msgVars) {
      this.msg = msg;
      if (msgVars) {
        this.msgVars = msgVars;
      }

      return this;
    },
    getMessage: function (obj) {
      var msg = this.msg;
      if (this.msgVars) {
        var args = [obj];
        if (this.msgArgs) {
          args = args.concat(this.msgArgs);
        }
        var vars = this.msgVars.apply(null, args);
        var splitMsg = msg.split('{|}')
        if (splitMsg.length == 1){
          return msg;
        }
        var finalMsg = [];
        for (var i = 0; i < splitMsg.length; i++) {
          finalMsg.push(splitMsg[i]);
          if (vars[i]) {
            finalMsg.push(vars[i]);
          }
        }

        return finalMsg.join('');
      }

      return msg;
    },
    validateCollection: function (vc) {
      vc = vc === undefined ? true : vc;
      this.runForCollection = vc;
    },
    run: function (obj, value) {
      var result = { $error: false };
      var canRun = this.canRun(obj);
      if (canRun) {
        if (value instanceof Array && !this.runForCollection) {
          result = [];
          result.$error = false;

          for(var i = 0; i < value.length; i++) {
            var isValid = this.isValid(obj, value[i]);
            if (!isValid) {
              result.push(this.getMessage(obj) || true);
              result.$error = true;
            }
            else {
              result.push(false);
            }
          }
        }
        else{
          var isValid = this.isValid(obj, value);
          if (!isValid) {
            result.message = this.getMessage(obj);
            result.$error = true;
          }
        }
      }

      return result;
    }
  }

  function ValidatorRule() {
    this.components = [];
  }

  ValidatorRule.prototype = {
    addComponent: function (component) {
      this.components.push(component);
    },
    validate: function (obj, value) {
      var results = {};
      for (component in this.components) {
        if (!this.components.hasOwnProperty(component)) {
          continue;
        }

        var c = this.components[component];
        results[c.name] = c.run(obj, value);
      }

      return results;
    }
  }

  function Validator (config) {
    this.rules = {};
    this.$errors = {};
    config(this);
  }

  Validator.prototype = {
    ruleFor: function(target, config) {
      var rule = this.rules[target] || (this.rules[target] = new ValidatorRule(target));
      config(rule);
      return rule;
    },
    applyTo: function (constructor) {
      constructor.prototype.$$validator = this;
    },
    validate: function (obj) {
      var errors = {};
      for (target in this.rules) {
        if (!this.rules.hasOwnProperty(target)) {
          continue;
        }

        var results = this.rules[target].validate(obj, obj[target]);
        errors[target] = results;
      }

      return obj.$errors = errors;
    }
  }

  var module = angular.module('validation', []);

  module.factory('Validator', function () {
    return Validator;
  })

  module.factory('ValidatorRuleComponent', function () {
    return ValidatorRuleComponent;
  });

  module.factory('ValidatorRule', function () {
    return ValidatorRule;
  });

  //need to point a form at a model and have it read the rules, attach a validator into the angular pipeline
  module.directive('validationTarget', function () {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, element, attrs, ctrl) {
        var scopePath = attrs.ngModel.split('.');
        var targetExpression = scopePath.slice(0, scopePath.length - 1).join('.');
        var targetField = scopePath.slice(scopePath.length - 1).join('');
        var validationScope = scope.$eval(targetExpression);//this is the object, we're expecting to find $$validator in the prototype
        var validator = validationScope.$$validator;

        if (!validator) {
          return;
        }

        var ruleSet = validator.rules[targetField];
        if (!ruleSet) {
          return;
        }

        var components = ruleSet.components;
        for (var i = 0; i < components.length; i++) {
          var component = components[i];
          var name = component.name;

          ctrl.$validators[name] = function (modelValue, viewValue) {
            var result = component.run(validationScope, viewValue);
            return !result.$error;
          }
        }
      }
    };
  });

  module.run(function (ValidatorRule) {
    function notEmpty() {
      var component = new ValidatorRuleComponent('notEmpty', function (obj, value) {
        if (value instanceof Array) {
          return value !== null && value.length > 0;
        }
        else {
          return value !== null && value != '';
        }
      });

      this.addComponent(component);
      return component;
    }
    ValidatorRule.prototype.notEmpty = notEmpty;

    function minLength(minLength) {
      var component = new ValidatorRuleComponent('minLength', function (obj, value) {
        return value === null || value.length >= minLength;
      });
      component.msgArgs = [minLength];
      component.msgVars = function (obj) { return [minLength]; };

      this.addComponent(component);
      return component;
    }
    ValidatorRule.prototype.minLength = minLength;

    function maxLength(maxLength) {
      var component = new ValidatorRuleComponent('maxLength', function (obj, value) {
        return value === null || value.length <= maxLength;
      });
      component.msgArgs = [maxLength];
      component.msgVars = function (obj) { return [maxLength]; };

      this.addComponent(component);
      return component;
    }
    ValidatorRule.prototype.maxLength = maxLength;

    function matches(compareTo) {
      var component = new ValidatorRuleComponent('matches', function (obj, value) {
        if (compareTo instanceof Function) {
          return value === null || value === compareTo(obj);
        }
        else {
          return value === null || value === compareTo;
        }
      });

      component.msgArgs = [compareTo];
      component.msgVars = function (obj) { return [compareTo instanceof Function ? compareTo(obj) : compareTo]; };

      this.addComponent(component);
      return component;
    }
    ValidatorRule.prototype.matches = matches;

    function min(minValue) {
      var component = new ValidatorRuleComponent('min', function (obj, value) {
        if (minValue instanceof Function) {
          return value === null || value >= minValue(obj);
        }
        else {
          return value === null || value >= minValue;
        }
      });
      component.msgArgs = [minValue];
      component.msgVars = function () { return [minValue]; };

      this.addComponent(component);
      return component;
    }
    ValidatorRule.prototype.min = min;

    function max(maxValue) {
      var component = new ValidatorRuleComponent('max', function (obj, value) {
        if (maxValue instanceof Function) {
          return value === null || value <= maxValue(obj);
        }
        else {
          return value === null || value <= maxValue;
        }
      });
      component.msgArgs = [maxValue];
      component.msgVars = function () { return [maxValue]; };

      this.addComponent(component);
      return component;
    }
    ValidatorRule.prototype.max = max;
  });
})();
