var validation =
(function () {
  'use strict';

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
      for (var constraint in this.constraints) {
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
      if (msgVars !== undefined) {
        this.msgVars = msgVars;
      }

      if(this.msg && this.msgVars) {
        var splitMsg = this.msg.split('{|}');
        if (splitMsg.length > 1) {
          this.$splitMsg = splitMsg;
          this.$args = [];

          if (this.msgArgs) {
            this.$args = this.$args.concat(this.msgArgs);
          }
        }
      }
      else {
        delete this.$splitMsg;
        delete this.$args;
      }

      return this;
    },
    getMessage: function (obj) {
      var msg = this.msg;
      if (this.$splitMsg) {
        var vars = this.msgVars.apply(null, [obj].concat(this.$args));
        var finalMsg = [];
        for (var i = 0; i < this.$splitMsg.length; i++) {
          finalMsg.push(this.$splitMsg[i]);
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
      var result = { error: false };
      var canRun = this.canRun(obj);
      if (canRun) {
        if (value instanceof Array && !this.runForCollection) {
          result = [];
          result.error = false;

          for(var i = 0; i < value.length; i++) {
            var isValid = this.isValid(obj, value[i]);
            if (!isValid) {
              result.push({ message: this.getMessage(obj), error: true });
              result.error = true;
            }
            else {
              result.push({ error: false });
            }
          }
        }
        else{
          var isValid = this.isValid(obj, value);
          if (!isValid) {
            result.message = this.getMessage(obj);
            result.error = true;
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
      for (var component in this.components) {
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
    this.errors = {};
    if (config) {
      config(this);
    }
  }

  Validator.prototype = {
    ruleFor: function(target, config) {
      var rule = this.rules[target] || (this.rules[target] = new ValidatorRule(target));
      config(rule);
      return rule;
    },
    applyTo: function (constructor) {
      constructor.prototype.$$validator = this;
      constructor.prototype.$validate = function () {
        return this.$$validator.validate(this);
      }
    },
    validate: function (obj) {
      var errors = {};
      for (var target in this.rules) {
        if (!this.rules.hasOwnProperty(target)) {
          continue;
        }

        var results = this.rules[target].validate(obj, obj[target]);
        errors[target] = results;
      }

      return obj.errors = errors;
    }
  }

  ValidatorRule.prototype.notEmpty = function () {
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
  };

  ValidatorRule.prototype.minLength = function (minLength) {
    var component = new ValidatorRuleComponent('minLength', function (obj, value) {
      return value === null || value.length >= minLength;
    });
    component.msgArgs = [minLength];
    component.msgVars = function (obj) { return [minLength]; };

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.maxLength = function (maxLength) {
    var component = new ValidatorRuleComponent('maxLength', function (obj, value) {
      return value === null || value.length <= maxLength;
    });
    component.msgArgs = [maxLength];
    component.msgVars = function (obj) { return [maxLength]; };

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.matches = function matches(compareTo) {
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
  };

  ValidatorRule.prototype.min = function (minValue) {
    var component = new ValidatorRuleComponent('min', function (obj, value) {
      if (value === null) {
        return true;
      }

      if (value instanceof Array) {
        value = value.length;
      }

      if (minValue instanceof Function) {
        var mv = minValue(obj);
        return mv === undefined || value >= mv;
      }
      else {
        return value >= minValue;
      }
    });
    component.msgArgs = [minValue];
    component.msgVars = function () { return [minValue]; };

    this.addComponent(component);
    return component;
  };

  ValidatorRule.prototype.max = function (maxValue) {
    var component = new ValidatorRuleComponent('max', function (obj, value) {
      if (value === null) {
        return true;
      }

      if (value instanceof Array) {
        value = value.length;
      }

      if (maxValue instanceof Function) {
        var mv = maxValue(obj);
        return mv === undefined || value >= mv;
      }
      else {
        return value <= maxValue;
      }
    });
    component.msgArgs = [maxValue];
    component.msgVars = function () { return [maxValue]; };

    this.addComponent(component);
    return component;
  };

  return {
    Validator : Validator,
    ValidatorRule: ValidatorRule,
    ValidatorRuleComponent: ValidatorRuleComponent
  };
})();
